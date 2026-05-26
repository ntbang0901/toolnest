import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import { Input } from "@/components/ui/input";

type Entity = "owner" | "group" | "other";
type Perm = "read" | "write" | "execute";

interface PermState {
  owner: { read: boolean; write: boolean; execute: boolean };
  group: { read: boolean; write: boolean; execute: boolean };
  other: { read: boolean; write: boolean; execute: boolean };
}

const ENTITIES: Entity[] = ["owner", "group", "other"];
const PERMS: Perm[] = ["read", "write", "execute"];
const PERM_BITS: Record<Perm, number> = { read: 4, write: 2, execute: 1 };
const PERM_CHARS: Record<Perm, string> = { read: "r", write: "w", execute: "x" };

const COMMON_MODES: { label: string; octal: string; description: string }[] = [
  { label: "755", octal: "755", description: "Executable / directory (owner full, others read+exec)" },
  { label: "644", octal: "644", description: "Regular file (owner read+write, others read)" },
  { label: "600", octal: "600", description: "Private file (owner only)" },
  { label: "777", octal: "777", description: "Full access for everyone" },
  { label: "700", octal: "700", description: "Private executable" },
  { label: "664", octal: "664", description: "Group-writable file" },
  { label: "775", octal: "775", description: "Group-writable directory" },
  { label: "400", octal: "400", description: "Read-only (owner)" },
];

function octalToState(octal: string): PermState | null {
  if (!/^[0-7]{3}$/.test(octal)) return null;
  const digits = octal.split("").map(Number);
  const parse = (n: number) => ({
    read: !!(n & 4),
    write: !!(n & 2),
    execute: !!(n & 1),
  });
  return { owner: parse(digits[0]), group: parse(digits[1]), other: parse(digits[2]) };
}

function stateToOctal(state: PermState): string {
  return ENTITIES.map((e) =>
    PERMS.reduce((acc, p) => acc + (state[e][p] ? PERM_BITS[p] : 0), 0)
  ).join("");
}

function stateToSymbolic(state: PermState): string {
  return ENTITIES.map((e) =>
    PERMS.map((p) => (state[e][p] ? PERM_CHARS[p] : "-")).join("")
  ).join("");
}

function stateToChmodCmd(state: PermState): string {
  const octal = stateToOctal(state);
  return `chmod ${octal} filename`;
}

const DEFAULT_STATE: PermState = {
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  other: { read: true, write: false, execute: true },
};

export default function ChmodCalculatorTool() {
  const [state, setState] = useState<PermState>(DEFAULT_STATE);
  const [octalInput, setOctalInput] = useState("755");
  const [octalError, setOctalError] = useState("");

  const octal = useMemo(() => stateToOctal(state), [state]);
  const symbolic = useMemo(() => stateToSymbolic(state), [state]);

  function toggle(entity: Entity, perm: Perm) {
    const next = {
      ...state,
      [entity]: { ...state[entity], [perm]: !state[entity][perm] },
    };
    setState(next);
    setOctalInput(stateToOctal(next));
    setOctalError("");
  }

  function applyOctal(value: string) {
    setOctalInput(value);
    if (/^[0-7]{3}$/.test(value)) {
      const parsed = octalToState(value);
      if (parsed) {
        setState(parsed);
        setOctalError("");
      }
    } else if (value.length === 3) {
      setOctalError("Must be 3 octal digits (0–7)");
    } else {
      setOctalError("");
    }
  }

  function applyPreset(octal: string) {
    const parsed = octalToState(octal);
    if (parsed) {
      setState(parsed);
      setOctalInput(octal);
      setOctalError("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Permission grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-20"></th>
              {PERMS.map((p) => (
                <th key={p} className="text-center py-2 px-4 font-medium capitalize">
                  {p}
                </th>
              ))}
              <th className="text-center py-2 px-4 font-medium text-muted-foreground">Octal</th>
            </tr>
          </thead>
          <tbody>
            {ENTITIES.map((entity) => {
              const digit = PERMS.reduce(
                (acc, p) => acc + (state[entity][p] ? PERM_BITS[p] : 0),
                0
              );
              return (
                <tr key={entity} className="border-t border-border">
                  <td className="py-3 pr-4 font-medium capitalize">{entity}</td>
                  {PERMS.map((perm) => (
                    <td key={perm} className="text-center py-3 px-4">
                      <input
                        type="checkbox"
                        checked={state[entity][perm]}
                        onChange={() => toggle(entity, perm)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    </td>
                  ))}
                  <td className="text-center py-3 px-4 font-mono text-muted-foreground">{digit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Results */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ResultField label="Octal" value={octal} />
        <ResultField label="Symbolic" value={symbolic} mono />
        <ResultField label="chmod command" value={`chmod ${octal} filename`} mono />
      </div>

      {/* Octal input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Enter octal directly</label>
        <div className="flex gap-2">
          <Input
            value={octalInput}
            onChange={(e) => applyOctal(e.target.value)}
            placeholder="e.g. 755"
            className="font-mono w-32"
            maxLength={3}
          />
        </div>
        {octalError && <p className="text-xs text-destructive">{octalError}</p>}
      </div>

      {/* Common presets */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Common modes</span>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card">
          {COMMON_MODES.map((m) => (
            <button
              key={m.octal}
              onClick={() => applyPreset(m.octal)}
              className={`flex items-center gap-3 px-3 py-2 text-sm text-left border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${
                octal === m.octal ? "bg-muted" : ""
              }`}
            >
              <span className="font-mono font-semibold w-8 shrink-0">{m.label}</span>
              <span className="text-muted-foreground">{m.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CopyButton value={value} label="" />
      </div>
      <div className={`break-all text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
