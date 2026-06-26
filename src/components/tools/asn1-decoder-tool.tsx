import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/tools/code-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";

// ── Sample PEM (self-signed cert for demo) ────────────────────────────────────
const SAMPLE_PEM = `-----BEGIN CERTIFICATE-----
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

// ── ASN.1 constants ────────────────────────────────────────────────────────────

// Universal tag numbers
const UNIVERSAL_TAGS: Record<number, string> = {
  0x01: "BOOLEAN",
  0x02: "INTEGER",
  0x03: "BIT STRING",
  0x04: "OCTET STRING",
  0x05: "NULL",
  0x06: "OID",
  0x07: "ObjectDescriptor",
  0x08: "EXTERNAL",
  0x09: "REAL",
  0x0a: "ENUMERATED",
  0x0b: "EMBEDDED PDV",
  0x0c: "UTF8String",
  0x0d: "RELATIVE-OID",
  0x10: "SEQUENCE",
  0x11: "SET",
  0x12: "NumericString",
  0x13: "PrintableString",
  0x14: "T61String",
  0x15: "VideotexString",
  0x16: "IA5String",
  0x17: "UTCTime",
  0x18: "GeneralizedTime",
  0x19: "GraphicString",
  0x1a: "VisibleString",
  0x1b: "GeneralString",
  0x1c: "UniversalString",
  0x1d: "CHARACTER STRING",
  0x1e: "BMPString",
};

// Well-known OID lookup
const OID_MAP: Record<string, string> = {
  // Signature algorithms
  "1.2.840.113549.1.1.1": "rsaEncryption",
  "1.2.840.113549.1.1.5": "sha1WithRSAEncryption",
  "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.12": "sha384WithRSAEncryption",
  "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
  "1.2.840.10045.2.1": "ecPublicKey",
  "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
  "1.2.840.10045.4.3.3": "ecdsa-with-SHA384",
  "1.2.840.10045.4.3.4": "ecdsa-with-SHA512",
  // Hash algorithms
  "2.16.840.1.101.3.4.2.1": "sha-256",
  "2.16.840.1.101.3.4.2.2": "sha-384",
  "2.16.840.1.101.3.4.2.3": "sha-512",
  "1.3.14.3.2.26": "sha-1",
  "1.2.840.113549.2.5": "md5",
  // X.500 attribute types
  "2.5.4.3": "commonName",
  "2.5.4.4": "surname",
  "2.5.4.5": "serialNumber",
  "2.5.4.6": "countryName",
  "2.5.4.7": "localityName",
  "2.5.4.8": "stateOrProvinceName",
  "2.5.4.9": "streetAddress",
  "2.5.4.10": "organizationName",
  "2.5.4.11": "organizationalUnitName",
  "2.5.4.12": "title",
  "2.5.4.42": "givenName",
  "2.5.4.43": "initials",
  "2.5.4.46": "dnQualifier",
  "2.5.4.65": "pseudonym",
  // PKCS #9
  "1.2.840.113549.1.9.1": "emailAddress",
  "1.2.840.113549.1.9.2": "unstructuredName",
  "1.2.840.113549.1.9.14": "extensionRequest",
  // X.509 extensions
  "2.5.29.1": "authorityKeyIdentifier (old)",
  "2.5.29.2": "keyAttributes",
  "2.5.29.3": "certificatePolicies (old)",
  "2.5.29.4": "keyUsageRestriction",
  "2.5.29.9": "subjectDirectoryAttributes",
  "2.5.29.14": "subjectKeyIdentifier",
  "2.5.29.15": "keyUsage",
  "2.5.29.16": "privateKeyUsagePeriod",
  "2.5.29.17": "subjectAltName",
  "2.5.29.18": "issuerAltName",
  "2.5.29.19": "basicConstraints",
  "2.5.29.20": "cRLNumber",
  "2.5.29.21": "reasonCode",
  "2.5.29.23": "instructionCode",
  "2.5.29.24": "invalidityDate",
  "2.5.29.27": "deltaCRLIndicator",
  "2.5.29.28": "issuingDistributionPoint",
  "2.5.29.29": "certificateIssuer",
  "2.5.29.30": "nameConstraints",
  "2.5.29.31": "cRLDistributionPoints",
  "2.5.29.32": "certificatePolicies",
  "2.5.29.33": "policyMappings",
  "2.5.29.35": "authorityKeyIdentifier",
  "2.5.29.36": "policyConstraints",
  "2.5.29.37": "extKeyUsage",
  "2.5.29.46": "freshestCRL",
  "2.5.29.54": "inhibitAnyPolicy",
  // Extended key usage
  "1.3.6.1.5.5.7.3.1": "serverAuth",
  "1.3.6.1.5.5.7.3.2": "clientAuth",
  "1.3.6.1.5.5.7.3.3": "codeSigning",
  "1.3.6.1.5.5.7.3.4": "emailProtection",
  "1.3.6.1.5.5.7.3.8": "timeStamping",
  "1.3.6.1.5.5.7.3.9": "OCSPSigning",
  // AIA
  "1.3.6.1.5.5.7.1.1": "authorityInfoAccess",
  "1.3.6.1.5.5.7.48.1": "OCSP",
  "1.3.6.1.5.5.7.48.2": "caIssuers",
  // EC named curves
  "1.2.840.10045.3.1.7": "prime256v1 (P-256)",
  "1.3.132.0.34": "secp384r1 (P-384)",
  "1.3.132.0.35": "secp521r1 (P-521)",
  // PKCS
  "1.2.840.113549.1.7.1": "data",
  "1.2.840.113549.1.7.2": "signedData",
  "1.2.840.113549.1.7.3": "envelopedData",
  "1.2.840.113549.1.12.10.1.1": "keyBag",
  "1.2.840.113549.1.12.10.1.2": "pkcs8ShroudedKeyBag",
  "1.2.840.113549.1.12.10.1.3": "certBag",
  // Microsoft
  "1.3.6.1.4.1.311.20.2.2": "msMicrosoftSmartcardLogin",
  "1.3.6.1.4.1.311.21.8": "msCertTemplateOID",
};

// ── ASN.1 parser ──────────────────────────────────────────────────────────────

export interface Asn1Node {
  /** Raw tag byte */
  tag: number;
  /** Tag class: 0=Universal, 1=Application, 2=Context-specific, 3=Private */
  tagClass: number;
  /** Whether the constructed bit is set */
  constructed: boolean;
  /** Tag number within the class */
  tagNumber: number;
  /** Byte offset of the tag byte in the original buffer */
  offset: number;
  /** Number of bytes consumed by tag+length */
  headerLen: number;
  /** Content length in bytes */
  len: number;
  /** Children (present when constructed) */
  children?: Asn1Node[];
  /** The full DER bytes for this node (header + content) */
  raw: Uint8Array;
}

function readLength(bytes: Uint8Array, offset: number): { len: number; bytesRead: number } {
  const first = bytes[offset];
  if ((first & 0x80) === 0) return { len: first, bytesRead: 1 };
  const numBytes = first & 0x7f;
  if (numBytes === 0) return { len: 0, bytesRead: 1 }; // indefinite — treat as 0
  let len = 0;
  for (let i = 0; i < numBytes; i++) {
    len = (len << 8) | bytes[offset + 1 + i];
  }
  return { len, bytesRead: 1 + numBytes };
}

function parseAsn1(bytes: Uint8Array, offset = 0, end?: number, depth = 0): Asn1Node[] {
  const stop = end ?? bytes.length;
  const nodes: Asn1Node[] = [];

  while (offset < stop) {
    if (offset >= bytes.length) break;
    const tagByte = bytes[offset];
    const tagClass = (tagByte >> 6) & 0x03;
    const constructed = !!(tagByte & 0x20);
    const tagNumber = tagByte & 0x1f;

    // Long-form tag (not commonly used, skip gracefully)
    if (tagNumber === 0x1f) break;

    if (offset + 1 >= bytes.length) break;
    const { len, bytesRead } = readLength(bytes, offset + 1);
    const headerLen = 1 + bytesRead;
    const contentStart = offset + headerLen;
    const nodeEnd = contentStart + len;

    if (nodeEnd > bytes.length) break;

    const node: Asn1Node = {
      tag: tagByte,
      tagClass,
      constructed,
      tagNumber,
      offset,
      headerLen,
      len,
      raw: bytes.slice(offset, nodeEnd),
    };

    if (constructed && depth < 64) {
      try {
        node.children = parseAsn1(bytes, contentStart, nodeEnd, depth + 1);
      } catch {
        // Leave children undefined if sub-parse fails
      }
    }

    nodes.push(node);
    offset = nodeEnd;
  }

  return nodes;
}

// ── Value decoders ────────────────────────────────────────────────────────────

function getContent(node: Asn1Node): Uint8Array {
  return node.raw.slice(node.headerLen);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

function decodeOid(node: Asn1Node): string {
  const bytes = getContent(node);
  if (bytes.length === 0) return "(empty)";
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

function decodeInteger(node: Asn1Node): string {
  const bytes = getContent(node);
  if (bytes.length === 0) return "0";
  // Small integer — show decimal + hex
  if (bytes.length <= 6) {
    let val = 0;
    for (const b of bytes) val = (val * 256) + b;
    return `${val} (0x${val.toString(16)})`;
  }
  return bytesToHex(bytes);
}

function decodeBoolean(node: Asn1Node): string {
  const bytes = getContent(node);
  return bytes[0] !== 0 ? "TRUE" : "FALSE";
}

function decodeBitString(node: Asn1Node): string {
  const bytes = getContent(node);
  if (bytes.length === 0) return "(empty)";
  const unusedBits = bytes[0];
  const rest = bytes.slice(1);
  const hexPart = bytesToHex(rest);
  return unusedBits > 0 ? `${hexPart} (${unusedBits} unused bits)` : hexPart;
}

function decodeString(node: Asn1Node): string {
  const bytes = getContent(node);
  if (node.tagNumber === 0x1e) {
    // BMPString: UCS-2 BE
    let s = "";
    for (let i = 0; i + 1 < bytes.length; i += 2)
      s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return s;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return bytesToHex(bytes);
  }
}

function decodeTime(node: Asn1Node): string {
  try {
    const s = decodeString(node);
    if (node.tagNumber === 0x17) {
      // UTCTime: YYMMDDHHMMSSZ
      const yy = parseInt(s.slice(0, 2), 10);
      const year = yy >= 50 ? 1900 + yy : 2000 + yy;
      const iso = `${year}-${s.slice(2, 4)}-${s.slice(4, 6)}T${s.slice(6, 8)}:${s.slice(8, 10)}:${s.slice(10, 12)}Z`;
      const d = new Date(iso);
      return isNaN(d.getTime()) ? s : `${d.toUTCString()} (${s})`;
    }
    // GeneralizedTime: YYYYMMDDHHMMSSZ
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? s : `${d.toUTCString()} (${s})`;
  } catch {
    return bytesToHex(getContent(node));
  }
}

/** Return a human-readable decoded value for a node */
function decodeValue(node: Asn1Node): string {
  if (node.len === 0) return "(empty)";
  if (node.constructed) return `${node.children?.length ?? 0} items`;

  // Universal tags we can decode meaningfully
  if (node.tagClass === 0) {
    switch (node.tagNumber) {
      case 0x01: return decodeBoolean(node);
      case 0x02: return decodeInteger(node);
      case 0x03: return decodeBitString(node);
      case 0x04: return bytesToHex(getContent(node));
      case 0x05: return "NULL";
      case 0x06: {
        const dotted = decodeOid(node);
        const name = OID_MAP[dotted];
        return name ? `${dotted} (${name})` : dotted;
      }
      case 0x0c: case 0x12: case 0x13: case 0x14:
      case 0x15: case 0x16: case 0x19: case 0x1a:
      case 0x1b: case 0x1e:
        return decodeString(node);
      case 0x17: case 0x18:
        return decodeTime(node);
    }
  }

  return bytesToHex(getContent(node));
}

/** Label for a node's type */
function tagLabel(node: Asn1Node): string {
  if (node.tagClass === 0) {
    // Universal
    const name = UNIVERSAL_TAGS[node.tagNumber];
    return name ?? `[UNIVERSAL ${node.tagNumber}]`;
  }
  if (node.tagClass === 1) return `[APPLICATION ${node.tagNumber}]`;
  if (node.tagClass === 2) return `[${node.tagNumber}]`; // context-specific
  return `[PRIVATE ${node.tagNumber}]`;
}

// ── Input parsing ─────────────────────────────────────────────────────────────

type InputMode = "auto" | "pem" | "base64" | "hex";

function parseInput(input: string, mode: InputMode): Uint8Array {
  const trimmed = input.trim();

  const tryPem = (): Uint8Array | null => {
    const pemMatch = trimmed.match(/-----BEGIN [^-]+-----\s*([\s\S]+?)\s*-----END [^-]+-----/);
    const b64 = pemMatch
      ? pemMatch[1].replace(/\s+/g, "")
      : /^[A-Za-z0-9+/=\s]+$/.test(trimmed)
        ? trimmed.replace(/\s+/g, "")
        : null;
    if (!b64) return null;
    try {
      const binary = atob(b64);
      return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    } catch {
      return null;
    }
  };

  const tryHex = (): Uint8Array | null => {
    const clean = trimmed.replace(/[\s:]/g, "");
    if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) return null;
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  };

  if (mode === "pem" || mode === "base64") {
    const r = tryPem();
    if (!r) throw new Error("Invalid PEM/Base64 input");
    return r;
  }
  if (mode === "hex") {
    const r = tryHex();
    if (!r) throw new Error("Invalid hex input");
    return r;
  }

  // auto: try PEM/base64 first, then hex
  const pemResult = tryPem();
  if (pemResult) return pemResult;
  const hexResult = tryHex();
  if (hexResult) return hexResult;
  throw new Error("Could not detect input format. Paste PEM, base64, or hex.");
}

// ── Hex dump ──────────────────────────────────────────────────────────────────

function HexDump({ bytes }: { bytes: Uint8Array }) {
  const COLS = 16;
  const rows: { offset: number; hex: string[]; ascii: string }[] = [];

  for (let i = 0; i < bytes.length; i += COLS) {
    const chunk = bytes.slice(i, i + COLS);
    const hex = Array.from(chunk).map((b) => b.toString(16).padStart(2, "0"));
    const ascii = Array.from(chunk)
      .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "."))
      .join("");
    rows.push({ offset: i, hex, ascii });
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-muted/30 p-3">
      <pre className="font-mono text-xs leading-5 text-foreground">
        {rows.map(({ offset, hex, ascii }) => (
          <div key={offset} className="flex gap-4">
            <span className="select-none text-muted-foreground w-8 shrink-0">
              {offset.toString(16).padStart(4, "0")}
            </span>
            <span className="flex-1">
              {hex.map((h, i) => (
                <span key={i}>
                  {h}
                  {i === 7 ? "  " : " "}
                </span>
              ))}
              {hex.length < COLS && (
                <span>
                  {Array(COLS - hex.length)
                    .fill("   ")
                    .join("")}
                </span>
              )}
            </span>
            <span className="select-none text-muted-foreground">{ascii}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

// ── Tree node component ───────────────────────────────────────────────────────

const TAG_CLASS_COLORS: Record<number, string> = {
  0: "text-blue-600 dark:text-blue-400",       // Universal
  1: "text-green-600 dark:text-green-400",     // Application
  2: "text-amber-600 dark:text-amber-400",     // Context-specific
  3: "text-purple-600 dark:text-purple-400",   // Private
};

function TreeNode({
  node,
  depth,
  initiallyExpanded,
}: {
  node: Asn1Node;
  depth: number;
  initiallyExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const hasChildren = node.constructed && (node.children?.length ?? 0) > 0;
  const label = tagLabel(node);
  const value = decodeValue(node);
  const colorClass = TAG_CLASS_COLORS[node.tagClass] ?? "text-foreground";

  return (
    <div className="font-mono text-xs">
      <div
        className={`flex items-start gap-1 rounded px-1 py-0.5 hover:bg-muted/50 ${hasChildren ? "cursor-pointer" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => hasChildren && setExpanded((v) => !v)}
        role={hasChildren ? "button" : undefined}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        {/* Expand/collapse icon */}
        <span className="mt-0.5 w-3 shrink-0 text-muted-foreground">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : null}
        </span>

        {/* Tag type */}
        <span className={`shrink-0 font-semibold ${colorClass}`}>{label}</span>

        {/* Offset */}
        <span className="shrink-0 text-muted-foreground">@{node.offset}</span>

        {/* Length */}
        <span className="shrink-0 text-muted-foreground">[{node.len}B]</span>

        {/* Value */}
        {!node.constructed && (
          <span className="ml-1 break-all text-foreground opacity-80">{value}</span>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && node.children && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode
              key={`${child.offset}-${i}`}
              node={child}
              depth={depth + 1}
              initiallyExpanded={depth < 2}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type ViewMode = "tree" | "hex";

export default function Asn1DecoderTool() {
  const [input, setInput] = useState(SAMPLE_PEM);
  const [inputMode, setInputMode] = useState<InputMode>("auto");
  const [viewMode, setViewMode] = useState<ViewMode>("tree");

  const result = useMemo<
    { ok: true; bytes: Uint8Array; nodes: Asn1Node[] } | { ok: false; error: string }
  >(() => {
    const trimmed = input.trim();
    if (!trimmed) return { ok: false, error: "" };
    try {
      const bytes = parseInput(trimmed, inputMode);
      const nodes = parseAsn1(bytes);
      if (nodes.length === 0) return { ok: false, error: "No ASN.1 structures found in input." };
      return { ok: true, bytes, nodes };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Parse error" };
    }
  }, [input, inputMode]);

  const hexDump = useMemo(() => {
    if (!result.ok) return "";
    return Array.from(result.bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
  }, [result]);

  return (
    <div className="flex flex-col gap-4">
      {/* Input */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">Input</span>
          <div className="flex items-center gap-2">
            <SegmentedControl
              ariaLabel="Input format"
              size="sm"
              value={inputMode}
              onChange={setInputMode}
              options={[
                { value: "auto", label: "Auto" },
                { value: "pem", label: "PEM" },
                { value: "base64", label: "Base64" },
                { value: "hex", label: "Hex" },
              ]}
            />
            <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
          </div>
        </div>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="plain"
          placeholder="Paste PEM, base64, or hex-encoded ASN.1 data…"
          minHeight="140px"
        />
      </div>

      {/* Error */}
      {result.ok === false && result.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </div>
      )}

      {/* Output */}
      {result.ok && (
        <div className="flex flex-col gap-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <SegmentedControl
                ariaLabel="View mode"
                size="sm"
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: "tree", label: "Tree" },
                  { value: "hex", label: "Hex Dump" },
                ]}
              />
              <span className="text-xs text-muted-foreground">
                {result.bytes.length} bytes · {result.nodes.length} root node
                {result.nodes.length !== 1 ? "s" : ""}
              </span>
            </div>
            <CopyButton value={hexDump} label="Copy hex" variant="ghost" size="sm" />
          </div>

          {/* Tree view */}
          {viewMode === "tree" && (
            <div className="rounded-md border bg-muted/20 p-2 overflow-x-auto">
              {/* Legend */}
              <div className="mb-2 flex flex-wrap gap-3 px-1 pb-2 border-b border-border/50">
                <span className="text-xs text-muted-foreground font-mono">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">SEQUENCE</span>
                  {" "}Universal
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  <span className="text-green-600 dark:text-green-400 font-semibold">[APP]</span>
                  {" "}Application
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">[0]</span>
                  {" "}Context
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">[PRIV]</span>
                  {" "}Private
                </span>
                <span className="text-xs text-muted-foreground">@offset [length]</span>
              </div>

              {result.nodes.map((node, i) => (
                <TreeNode
                  key={`${node.offset}-${i}`}
                  node={node}
                  depth={0}
                  initiallyExpanded={true}
                />
              ))}
            </div>
          )}

          {/* Hex dump view */}
          {viewMode === "hex" && <HexDump bytes={result.bytes} />}
        </div>
      )}
    </div>
  );
}

