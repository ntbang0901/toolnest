import { useState, useEffect } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";

type HmacAlgo = "SHA-1" | "SHA-256" | "SHA-512";

const ALGOS: HmacAlgo[] = ["SHA-1", "SHA-256", "SHA-512"];

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function computeHmac(algo: HmacAlgo, message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: algo },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

export default function HmacGeneratorTool() {
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [algo, setAlgo] = useState<HmacAlgo>("SHA-256");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    if (!message && !secret) {
      setOutput("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await computeHmac(algo, message, secret);
        if (!cancelled) setOutput(result);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [message, secret, algo]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Algorithm</span>
          <SegmentedControl
            size="sm"
            ariaLabel="HMAC algorithm"
            value={algo}
            onChange={(v) => setAlgo(v as HmacAlgo)}
            options={ALGOS.map((a) => ({ value: a, label: a }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Message</span>
        <CodeEditor
          value={message}
          onChange={setMessage}
          language="plain"
          placeholder="Enter message to sign…"
          minHeight="120px"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Secret key</span>
        <Input
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Enter secret key…"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">HMAC digest</span>
          <CopyButton value={output} label="" />
        </div>
        <div className="rounded-md border border-border bg-card p-3 font-mono text-sm break-all min-h-[44px]">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : output ? (
            output
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Computed locally using the Web Crypto API. Nothing is sent to a server.
        </p>
      </div>
    </div>
  );
}
