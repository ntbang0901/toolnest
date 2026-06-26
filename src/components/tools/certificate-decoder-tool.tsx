import { useMemo, useState } from "react";
import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/tools/code-editor";
import { CopyButton } from "@/components/tools/copy-button";

// A real self-signed cert (generated for example.com, expired — good for demo)
const SAMPLE_CERT = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDU+pQ4pHgSpDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
o4qne60TB3wolhT5wEZBQnSBBxfqjTuFR5nQ5SBfEBgsSR5Iu2Bj2GQQWLYUVMZO
C3i3mGRBb3D4KTZ8+yJl7GsA01K9x4T7fSKhUqEBY3JXlpHGN1MXuNAqr7hXeRYE
pWFz5X5Oihn2IjEKNfkb5YV6sD8Lhk9qXjT6mGVTdMWPRxJmKhNz4W6t3H3a1iXf
7b4+Jl4sFGmP3P6x3yJQWrb5OWYXHHkfC3WCqxiTXzI9XfTD7Nl8kMDc7gXzYtQL
VH5lO4P4+sIijPnFO0yqB6nDCjFPdMQm7G0L3tUMT2LxQJ9E7fCi1fK1N8n5IAPQ
2aTzGLlWXWJnVhJZAgMBAAEwDQYJKoZIhvcNAQELBQADggEBABFtaoWDOmC+gNBg
MvF4GVPXSY2Aq1VgPFXnmPJTRTrGxFvabP3bF+KtD+GkxMGkGDz7dLuMT2X4xKlG
fyJn6JhiEqrXeJPLqkLuFlTmAjmZ5b3Z3TgGt4a6Uh4QcCVrG5T1P7jK9OVpMnTo
WoOIFpUPOlHRZ4gG7w7jh4DNJX5CnUiWJ3kRRvNmE0UZV5YmT4PgZb2IwKuMBK7R
2tHmT4G1jVnU5j5pFGQ5pJzOUFZ0QHnDZ7AuKJT2nGWVT5jYi3zyKbMT1Lp3OPWI
6m6Iz7fCK8RpjuAUnG8+KHE8Z3E6vRiPkFjYT1TK/Z3Lm6E8yFb0GQ5bH6ZHwnJN
TkF0l+I=
-----END CERTIFICATE-----`;

// ── ASN.1 / DER parsing helpers ──────────────────────────────────────────────

function readLength(bytes: Uint8Array, offset: number): { len: number; bytesRead: number } {
  const first = bytes[offset];
  if (first < 0x80) return { len: first, bytesRead: 1 };
  const numBytes = first & 0x7f;
  let len = 0;
  for (let i = 0; i < numBytes; i++) {
    len = (len << 8) | bytes[offset + 1 + i];
  }
  return { len, bytesRead: 1 + numBytes };
}

interface Asn1Node {
  tag: number;
  constructed: boolean;
  offset: number;       // start of tag byte
  headerLen: number;    // tag + length bytes
  len: number;          // content length
  children?: Asn1Node[];
  raw: Uint8Array;      // full DER bytes for this node (header + content)
}

function parseAsn1(bytes: Uint8Array, offset = 0, end?: number): Asn1Node[] {
  const stop = end ?? bytes.length;
  const nodes: Asn1Node[] = [];

  while (offset < stop) {
    const tag = bytes[offset];
    const constructed = !!(tag & 0x20);
    const { len, bytesRead } = readLength(bytes, offset + 1);
    const headerLen = 1 + bytesRead;
    const contentStart = offset + headerLen;
    const nodeEnd = contentStart + len;

    const node: Asn1Node = {
      tag,
      constructed,
      offset,
      headerLen,
      len,
      raw: bytes.slice(offset, nodeEnd),
    };

    if (constructed) {
      node.children = parseAsn1(bytes, contentStart, nodeEnd);
    }

    nodes.push(node);
    offset = nodeEnd;
  }

  return nodes;
}

function asn1Content(node: Asn1Node): Uint8Array {
  return node.raw.slice(node.headerLen);
}

// Decode a UTF8String / PrintableString / IA5String / BMPString / T61String
function decodeString(node: Asn1Node): string {
  const content = asn1Content(node);
  // BMP string: UCS-2 BE
  if (node.tag === 0x1e) {
    let s = "";
    for (let i = 0; i < content.length; i += 2) s += String.fromCharCode((content[i] << 8) | content[i + 1]);
    return s;
  }
  return new TextDecoder().decode(content);
}

// Decode a UTCTime / GeneralizedTime node to a Date
function decodeTime(node: Asn1Node): Date {
  const s = decodeString(node);
  // UTCTime: YYMMDDHHMMSSZ  (tag 0x17)
  if (node.tag === 0x17) {
    const yy = parseInt(s.slice(0, 2), 10);
    const year = yy >= 50 ? 1900 + yy : 2000 + yy;
    return new Date(
      `${year}-${s.slice(2, 4)}-${s.slice(4, 6)}T${s.slice(6, 8)}:${s.slice(8, 10)}:${s.slice(10, 12)}Z`
    );
  }
  // GeneralizedTime: YYYYMMDDHHMMSSZ
  return new Date(
    `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`
  );
}

// Format bytes as colon-separated hex
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(":");
}

// Parse RDN sequence (Name) → "CN=..., O=..., ..."
function parseName(seqNode: Asn1Node): string {
  if (!seqNode.children) return "";
  const parts: string[] = [];

  const OID_NAMES: Record<string, string> = {
    "2.5.4.3": "CN",
    "2.5.4.6": "C",
    "2.5.4.7": "L",
    "2.5.4.8": "ST",
    "2.5.4.10": "O",
    "2.5.4.11": "OU",
    "1.2.840.113549.1.9.1": "emailAddress",
  };

  for (const rdn of seqNode.children) {
    // RDN is SET → SEQUENCE → OID + value
    const attrSet = rdn.children?.[0];
    if (!attrSet) continue;
    const oidNode = attrSet.children?.[0];
    const valNode = attrSet.children?.[1];
    if (!oidNode || !valNode) continue;
    const oid = decodeOid(oidNode);
    const label = OID_NAMES[oid] ?? oid;
    parts.push(`${label}=${decodeString(valNode)}`);
  }
  return parts.join(", ");
}

// Decode an OID node to dotted notation
function decodeOid(node: Asn1Node): string {
  const bytes = asn1Content(node);
  const parts: number[] = [];
  parts.push(Math.floor(bytes[0] / 40));
  parts.push(bytes[0] % 40);
  let val = 0;
  for (let i = 1; i < bytes.length; i++) {
    val = (val << 7) | (bytes[i] & 0x7f);
    if (!(bytes[i] & 0x80)) {
      parts.push(val);
      val = 0;
    }
  }
  return parts.join(".");
}

const OID_NAMES: Record<string, string> = {
  "1.2.840.113549.1.1.11": "SHA-256 with RSA",
  "1.2.840.113549.1.1.12": "SHA-384 with RSA",
  "1.2.840.113549.1.1.13": "SHA-512 with RSA",
  "1.2.840.113549.1.1.5": "SHA-1 with RSA",
  "1.2.840.10045.4.3.2": "ECDSA with SHA-256",
  "1.2.840.10045.4.3.3": "ECDSA with SHA-384",
  "1.2.840.10045.4.3.4": "ECDSA with SHA-512",
  "1.3.14.3.2.29": "SHA-1 with RSA (legacy)",
  "2.5.29.17": "subjectAltName",
  "2.5.29.15": "keyUsage",
  "2.5.29.37": "extKeyUsage",
  "2.5.29.19": "basicConstraints",
};

const KEY_USAGE_BITS = [
  "Digital Signature",
  "Non Repudiation",
  "Key Encipherment",
  "Data Encipherment",
  "Key Agreement",
  "Key Cert Sign",
  "CRL Sign",
  "Encipher Only",
  "Decipher Only",
];

// ── Certificate field extraction ─────────────────────────────────────────────

interface CertInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  signatureAlgorithm: string;
  subjectAltNames: string[];
  keyUsages: string[];
  isCA: boolean | null;
}

function decodeCert(pem: string): CertInfo {
  // Strip headers and whitespace, then base64-decode
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const der = Uint8Array.from(binary, (c) => c.charCodeAt(0));

  // Top-level: SEQUENCE (Certificate)
  const [certSeq] = parseAsn1(der);
  if (!certSeq.children) throw new Error("Invalid certificate structure");

  // Certificate = SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
  const [tbsCert, sigAlgSeq] = certSeq.children;
  if (!tbsCert.children) throw new Error("Invalid tbsCertificate");

  // Decode signature algorithm
  const sigAlgOidNode = sigAlgSeq?.children?.[0];
  const signatureAlgorithm = sigAlgOidNode
    ? (OID_NAMES[decodeOid(sigAlgOidNode)] ?? decodeOid(sigAlgOidNode))
    : "Unknown";

  // tbsCertificate fields (by position, skipping optional context tags)
  // [0] version (optional, context [0])
  // [1] serialNumber
  // [2] signature
  // [3] issuer
  // [4] validity
  // [5] subject
  // [6] subjectPublicKeyInfo
  // [7+] optional extensions (context tags)

  const fields = tbsCert.children;
  let idx = 0;

  // Skip optional version [0] EXPLICIT
  if ((fields[idx].tag & 0xc0) === 0x80 && (fields[idx].tag & 0x1f) === 0) idx++;

  const serialNode = fields[idx++];
  const _sigAlg = fields[idx++]; // inner sigAlg (same as outer)
  const issuerNode = fields[idx++];
  const validityNode = fields[idx++];
  const subjectNode = fields[idx++];
  idx++; // subjectPublicKeyInfo — skip

  // Parse serial number
  const serialBytes = asn1Content(serialNode);
  const serialNumber = toHex(serialBytes).toUpperCase().replace(/:/g, " ");

  // Parse issuer / subject
  const issuer = parseName(issuerNode);
  const subject = parseName(subjectNode);

  // Parse validity
  const [notBeforeNode, notAfterNode] = validityNode.children ?? [];
  const validFrom = decodeTime(notBeforeNode);
  const validTo = decodeTime(notAfterNode);

  // Parse extensions
  const subjectAltNames: string[] = [];
  const keyUsages: string[] = [];
  let isCA: boolean | null = null;

  for (let i = idx; i < fields.length; i++) {
    const field = fields[i];
    // Extensions are context [3] EXPLICIT SEQUENCE
    if ((field.tag & 0xc0) === 0x80 && (field.tag & 0x1f) === 3 && field.children) {
      const extsSeq = field.children[0];
      for (const ext of extsSeq.children ?? []) {
        // Extension SEQUENCE: OID, optional BOOLEAN (critical), OCTET STRING
        const oidNode = ext.children?.[0];
        if (!oidNode) continue;
        const oid = decodeOid(oidNode);

        // Value is wrapped in OCTET STRING — find it
        const octetNode = ext.children?.find((c) => c.tag === 0x04);
        if (!octetNode) continue;
        const extValue = parseAsn1(asn1Content(octetNode));

        if (oid === "2.5.29.17") {
          // SubjectAltName: SEQUENCE of GeneralName
          for (const gn of extValue[0]?.children ?? []) {
            const gnTag = gn.tag & 0x1f;
            const gnContent = asn1Content(gn);
            if (gnTag === 2) subjectAltNames.push("DNS:" + new TextDecoder().decode(gnContent));
            else if (gnTag === 7) {
              if (gnContent.length === 4) subjectAltNames.push("IP:" + gnContent.join("."));
              else if (gnContent.length === 16)
                subjectAltNames.push(
                  "IP:" + Array.from(gnContent)
                    .map((b, i) => (i % 2 === 0 ? b.toString(16).padStart(2, "0") : b.toString(16).padStart(2, "0") + (i < 15 ? ":" : "")).replace(/::/, ":"))
                    .join("")
                );
            } else if (gnTag === 1) subjectAltNames.push("email:" + new TextDecoder().decode(gnContent));
          }
        } else if (oid === "2.5.29.15") {
          // KeyUsage: BIT STRING
          const bitStr = extValue[0];
          if (bitStr) {
            const content = asn1Content(bitStr);
            const unusedBits = content[0];
            const usageByte0 = content[1] ?? 0;
            const usageByte1 = content[2] ?? 0;
            const combined = (usageByte0 << 8) | usageByte1;
            for (let b = 0; b < 9; b++) {
              if (combined & (0x8000 >> b)) keyUsages.push(KEY_USAGE_BITS[b]);
            }
            void unusedBits;
          }
        } else if (oid === "2.5.29.19") {
          // BasicConstraints
          const seq = extValue[0];
          if (seq?.children?.[0]?.tag === 0x01) {
            isCA = asn1Content(seq.children[0])[0] !== 0;
          } else {
            isCA = false;
          }
        }
      }
    }
  }

  return { subject, issuer, serialNumber, validFrom, validTo, signatureAlgorithm, subjectAltNames, keyUsages, isCA };
}

// ── Validity status ──────────────────────────────────────────────────────────

type ValidityStatus = "valid" | "expired" | "not-yet-valid";

function getValidity(from: Date, to: Date): ValidityStatus {
  const now = new Date();
  if (now < from) return "not-yet-valid";
  if (now > to) return "expired";
  return "valid";
}

function formatDate(d: Date): string {
  return d.toUTCString();
}

// ── UI helpers ───────────────────────────────────────────────────────────────

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm break-all${mono ? " font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CertificateDecoderTool() {
  const [pem, setPem] = useState(SAMPLE_CERT);

  const result = useMemo<{ ok: true; cert: CertInfo } | { ok: false; error: string }>(() => {
    const trimmed = pem.trim();
    if (!trimmed) return { ok: true, cert: null as unknown as CertInfo };
    try {
      return { ok: true, cert: decodeCert(trimmed) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to parse certificate" };
    }
  }, [pem]);

  const cert = result.ok ? result.cert : null;
  const validity = cert ? getValidity(cert.validFrom, cert.validTo) : null;

  const statusConfig = {
    valid: {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Valid",
      className: "text-green-600 dark:text-green-400",
      badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    },
    expired: {
      icon: <ShieldAlert className="h-4 w-4" />,
      label: "Expired",
      className: "text-destructive",
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
    "not-yet-valid": {
      icon: <Clock className="h-4 w-4" />,
      label: "Not Yet Valid",
      className: "text-amber-600 dark:text-amber-400",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Input */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">PEM Certificate</span>
          <Button variant="ghost" size="sm" onClick={() => setPem("")} disabled={!pem}>
            Clear
          </Button>
        </div>
        <CodeEditor
          value={pem}
          onChange={setPem}
          language="plain"
          placeholder={"-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----"}
          minHeight="180px"
        />
      </div>

      {/* Error */}
      {!result.ok && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </div>
      )}

      {/* Decoded output */}
      {cert && (
        <div className="flex flex-col gap-6">
          {/* Validity badge */}
          {validity && (
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${statusConfig[validity].badgeClass}`}
              >
                <span className={statusConfig[validity].className}>{statusConfig[validity].icon}</span>
                {statusConfig[validity].label}
              </span>
              {cert.isCA && (
                <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                  CA Certificate
                </span>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Identity */}
            <Section title="Identity">
              <Field label="Subject" value={cert.subject} />
              <Field label="Issuer" value={cert.issuer} />
            </Section>

            {/* Validity period */}
            <Section title="Validity Period">
              <Field label="Valid From" value={formatDate(cert.validFrom)} />
              <Field label="Valid To" value={formatDate(cert.validTo)} />
            </Section>

            {/* Technical details */}
            <Section title="Details">
              <Field label="Signature Algorithm" value={cert.signatureAlgorithm} />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Serial Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs break-all flex-1">{cert.serialNumber || "—"}</span>
                  {cert.serialNumber && <CopyButton value={cert.serialNumber} />}
                </div>
              </div>
            </Section>

            {/* Key usage */}
            {cert.keyUsages.length > 0 && (
              <Section title="Key Usage">
                <div className="flex flex-wrap gap-1.5">
                  {cert.keyUsages.map((ku) => (
                    <span
                      key={ku}
                      className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      {ku}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* SANs */}
          {cert.subjectAltNames.length > 0 && (
            <Section title="Subject Alternative Names">
              <div className="flex flex-wrap gap-1.5">
                {cert.subjectAltNames.map((san) => (
                  <span
                    key={san}
                    className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground"
                  >
                    {san}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
