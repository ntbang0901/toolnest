import { useState, useCallback } from "react";
import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/tools/code-editor";
import { CopyButton } from "@/components/tools/copy-button";

interface JwkField {
  key: string;
  value: string;
  description: string;
}

interface JwkAnalysis {
  fields: JwkField[];
  keyType: string;
  errors: string[];
  warnings: string[];
  pemView?: string;
  fingerprint?: string;
}

const FIELD_DESCRIPTIONS: Record<string, string> = {
  kty: "Key type (RSA, EC, oct)",
  use: "Intended use: sig (signature) or enc (encryption)",
  key_ops: "Key operations (sign, verify, encrypt, decrypt…)",
  alg: "Algorithm (RS256, ES256, HS256…)",
  kid: "Key ID — arbitrary identifier for this key",
  x5u: "URL of X.509 certificate chain",
  x5c: "X.509 certificate chain (base64 DER)",
  x5t: "SHA-1 thumbprint of X.509 certificate",
  "x5t#S256": "SHA-256 thumbprint of X.509 certificate",
  n: "RSA modulus (base64url-encoded)",
  e: "RSA public exponent (base64url-encoded)",
  d: "RSA/EC private exponent (base64url-encoded)",
  p: "RSA first prime factor",
  q: "RSA second prime factor",
  dp: "RSA first factor CRT exponent",
  dq: "RSA second factor CRT exponent",
  qi: "RSA first CRT coefficient",
  crv: "EC curve name (P-256, P-384, P-521, Ed25519…)",
  x: "EC public key x-coordinate (base64url-encoded)",
  y: "EC public key y-coordinate (base64url-encoded)",
  k: "Symmetric key value (base64url-encoded, oct)",
};

function b64urlByteLength(b64url: string): number {
  const base = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base + "=".repeat((4 - (base.length % 4)) % 4);
  try {
    return atob(padded).length;
  } catch {
    return 0;
  }
}

function formatFieldValue(key: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  const str = String(value);
  // Show byte length for base64url fields
  if (["n", "e", "d", "p", "q", "dp", "dq", "qi", "x", "y", "k"].includes(key)) {
    const bytes = b64urlByteLength(str);
    const bits = bytes * 8;
    return `${str.slice(0, 32)}${str.length > 32 ? "…" : ""} (${bits} bits / ${bytes} bytes)`;
  }
  return str;
}

function validateJwk(jwk: Record<string, unknown>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const kty = jwk.kty as string | undefined;

  if (!kty) {
    errors.push('Missing required field "kty"');
    return { errors, warnings };
  }

  if (kty === "RSA") {
    if (!jwk.n) errors.push('RSA key missing required field "n" (modulus)');
    if (!jwk.e) errors.push('RSA key missing required field "e" (exponent)');
    if (jwk.d && (!jwk.p || !jwk.q)) warnings.push("RSA private key: missing CRT parameters (p, q) — less efficient");
  } else if (kty === "EC") {
    if (!jwk.crv) errors.push('EC key missing required field "crv" (curve)');
    if (!jwk.x) errors.push('EC key missing required field "x" (x-coordinate)');
    if (!jwk.y) errors.push('EC key missing required field "y" (y-coordinate)');
  } else if (kty === "oct") {
    if (!jwk.k) errors.push('Symmetric key missing required field "k"');
  } else {
    warnings.push(`Unknown key type: ${kty}`);
  }

  if (jwk.use && jwk.key_ops) {
    warnings.push('"use" and "key_ops" should not both be present — use one or the other');
  }

  return { errors, warnings };
}

async function computeFingerprint(jwk: Record<string, unknown>): Promise<string> {
  // RFC 7638: thumbprint over sorted minimal fields
  const kty = jwk.kty as string;
  let fields: Record<string, unknown>;
  if (kty === "RSA") {
    fields = { e: jwk.e, kty, n: jwk.n };
  } else if (kty === "EC") {
    fields = { crv: jwk.crv, kty, x: jwk.x, y: jwk.y };
  } else if (kty === "oct") {
    fields = { k: jwk.k, kty };
  } else {
    fields = { kty };
  }
  const json = JSON.stringify(fields);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  const bytes = new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function analyzeJwk(jwk: Record<string, unknown>): JwkAnalysis {
  const fields: JwkField[] = Object.entries(jwk).map(([k, v]) => ({
    key: k,
    value: formatFieldValue(k, v),
    description: FIELD_DESCRIPTIONS[k] ?? "Custom/extension field",
  }));

  const kty = (jwk.kty as string) ?? "unknown";
  const isPrivate = Boolean(jwk.d || (kty === "oct" && jwk.k));
  const keyType = `${kty}${isPrivate ? " (private)" : " (public)"}`;

  const { errors, warnings } = validateJwk(jwk);

  return { fields, keyType, errors, warnings };
}

const SAMPLE_JWK = `{
  "kty": "RSA",
  "use": "sig",
  "alg": "RS256",
  "kid": "2011-04-29",
  "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
  "e": "AQAB"
}`;

export default function JwkInspectorTool() {
  const [input, setInput] = useState(SAMPLE_JWK);
  const [analyses, setAnalyses] = useState<Array<{ index?: number; analysis: JwkAnalysis; raw: Record<string, unknown> }>>([]);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [fingerprints, setFingerprints] = useState<Record<number, string>>({});

  const inspect = useCallback(async () => {
    setFingerprints({});
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      setGlobalErrors([`JSON parse error: ${e instanceof Error ? e.message : String(e)}`]);
      setAnalyses([]);
      return;
    }
    setGlobalErrors([]);

    const isJwks =
      parsed !== null &&
      typeof parsed === "object" &&
      "keys" in (parsed as object) &&
      Array.isArray((parsed as { keys: unknown }).keys);

    if (isJwks) {
      const keys = (parsed as { keys: Record<string, unknown>[] }).keys;
      const results = keys.map((jwk, i) => ({ index: i, analysis: analyzeJwk(jwk), raw: jwk }));
      setAnalyses(results);
      // Compute fingerprints async
      keys.forEach(async (jwk, i) => {
        try {
          const fp = await computeFingerprint(jwk);
          setFingerprints((prev) => ({ ...prev, [i]: fp }));
        } catch {
          // ignore fingerprint errors
        }
      });
    } else if (parsed !== null && typeof parsed === "object") {
      const jwk = parsed as Record<string, unknown>;
      const analysis = analyzeJwk(jwk);
      setAnalyses([{ analysis, raw: jwk }]);
      try {
        const fp = await computeFingerprint(jwk);
        setFingerprints({ 0: fp });
      } catch {
        // ignore
      }
    } else {
      setGlobalErrors(["Input must be a JWK object or JWKS {keys: [...]} object"]);
      setAnalyses([]);
    }
  }, [input]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="jwk-input">
          JWK or JWKS JSON
        </label>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="json"
          placeholder='Paste a JWK {"kty":"RSA",...} or JWKS {"keys":[...]} object'
          minHeight="180px"
        />
        <Button onClick={inspect} className="self-start">
          <Key className="h-4 w-4" />
          Inspect
        </Button>
      </div>

      {globalErrors.map((e, i) => (
        <div key={i} className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {e}
        </div>
      ))}

      {analyses.map(({ index, analysis, raw }, ai) => {
        const fpKey = index !== undefined ? index : 0;
        const fp = fingerprints[fpKey];
        return (
          <div key={ai} className="flex flex-col gap-4 rounded-md border p-4">
            {analyses.length > 1 && (
              <div className="text-sm font-medium text-muted-foreground">
                Key {(index ?? 0) + 1} of {analyses.length}
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Key type: </span>
                <span className="font-mono font-medium">{analysis.keyType}</span>
              </div>
              {fp && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Fingerprint (JWK SHA-256): </span>
                  <span className="font-mono text-xs">{fp}</span>
                  <CopyButton value={fp} label="Copy" />
                </div>
              )}
            </div>

            {analysis.errors.map((e, i) => (
              <div key={i} className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Error: {e}
              </div>
            ))}
            {analysis.warnings.map((w, i) => (
              <div key={i} className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                Warning: {w}
              </div>
            ))}
            {analysis.errors.length === 0 && analysis.warnings.length === 0 && (
              <div className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                Valid JWK structure.
              </div>
            )}

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium w-20">Field</th>
                    <th className="px-3 py-2 text-left font-medium">Value</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.fields.map((field) => (
                    <tr key={field.key} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono font-medium">{field.key}</td>
                      <td className="px-3 py-2 font-mono text-xs break-all">{field.value}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{field.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Raw JSON</span>
              <CopyButton value={JSON.stringify(raw, null, 2)} label="Copy" />
            </div>
            <pre className="rounded-md border bg-muted/40 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
