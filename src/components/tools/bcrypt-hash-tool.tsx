import { useState } from "react";
import bcrypt from "bcryptjs";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

type Mode = "hash" | "verify";

export default function BcryptHashTool() {
  const [mode, setMode] = useState<Mode>("hash");

  // Hash tab state
  const [password, setPassword] = useState("");
  const [rounds, setRounds] = useState(10);
  const [hashOutput, setHashOutput] = useState("");
  const [hashing, setHashing] = useState(false);

  // Verify tab state
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [error, setError] = useState("");

  async function handleHash() {
    if (!password) return;
    setHashing(true);
    setError("");
    setHashOutput("");
    try {
      const hash = await bcrypt.hash(password, rounds);
      setHashOutput(hash);
    } catch (e) {
      setError(String(e));
    } finally {
      setHashing(false);
    }
  }

  async function handleVerify() {
    if (!verifyPassword || !verifyHash) return;
    setVerifying(true);
    setError("");
    setVerifyResult(null);
    try {
      const match = await bcrypt.compare(verifyPassword, verifyHash);
      setVerifyResult(match);
    } catch (e) {
      setError(String(e));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex">
        <SegmentedControl
          size="sm"
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => {
            setMode(v as Mode);
            setError("");
            setVerifyResult(null);
          }}
          options={[
            { value: "hash", label: "Hash" },
            { value: "verify", label: "Verify" },
          ]}
        />
      </div>

      {mode === "hash" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to hash…"
              onKeyDown={(e) => e.key === "Enter" && handleHash()}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cost rounds: {rounds}</span>
              <span className="text-xs text-muted-foreground">Higher = slower but more secure</span>
            </div>
            <input
              type="range"
              min={4}
              max={12}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>4 (fast)</span>
              <span>12 (slow)</span>
            </div>
          </div>

          <Button onClick={handleHash} disabled={!password || hashing}>
            {hashing ? "Hashing…" : "Hash password"}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {hashOutput && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Hash output</span>
                <CopyButton value={hashOutput} label="" />
              </div>
              <div className="rounded-md border border-border bg-card p-3 font-mono text-sm break-all">
                {hashOutput}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Hashed locally using bcryptjs. Nothing is sent to a server.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Password</span>
            <Input
              type="password"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              placeholder="Enter password to verify…"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Bcrypt hash</span>
            <Input
              type="text"
              value={verifyHash}
              onChange={(e) => { setVerifyHash(e.target.value); setVerifyResult(null); }}
              placeholder="$2a$10$…"
              spellCheck={false}
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={!verifyPassword || !verifyHash || verifying}
          >
            {verifying ? "Verifying…" : "Verify"}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {verifyResult !== null && (
            <div
              className={`rounded-md border p-3 text-sm font-medium ${
                verifyResult
                  ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                  : "border-destructive bg-destructive/10 text-destructive"
              }`}
            >
              {verifyResult ? "Password matches the hash." : "Password does not match the hash."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
