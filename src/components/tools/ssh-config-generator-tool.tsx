import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";

interface HostEntry {
  id: string;
  host: string;
  hostname: string;
  user: string;
  port: string;
  identityFile: string;
  proxyJump: string;
  forwardAgent: boolean;
  serverAliveInterval: string;
  serverAliveCountMax: string;
  compression: boolean;
  strictHostKeyChecking: string;
}

function emptyEntry(overrides: Partial<HostEntry> = {}): HostEntry {
  return {
    id: crypto.randomUUID(),
    host: "",
    hostname: "",
    user: "",
    port: "",
    identityFile: "",
    proxyJump: "",
    forwardAgent: false,
    serverAliveInterval: "",
    serverAliveCountMax: "",
    compression: false,
    strictHostKeyChecking: "",
    ...overrides,
  };
}

const DEFAULT_ENTRY = emptyEntry({
  host: "my-server",
  hostname: "192.168.1.100",
  user: "ubuntu",
  port: "22",
  identityFile: "~/.ssh/id_rsa",
  serverAliveInterval: "60",
});

type Preset = {
  label: string;
  entry: Partial<Omit<HostEntry, "id">>;
};

const PRESETS: Preset[] = [
  {
    label: "GitHub",
    entry: {
      host: "github.com",
      hostname: "github.com",
      user: "git",
      identityFile: "~/.ssh/id_ed25519",
      port: "",
    },
  },
  {
    label: "GitLab",
    entry: {
      host: "gitlab.com",
      hostname: "gitlab.com",
      user: "git",
      identityFile: "~/.ssh/id_ed25519",
      port: "",
    },
  },
  {
    label: "AWS EC2",
    entry: {
      host: "ec2-prod",
      hostname: "ec2-XX-XX-XX-XX.compute-1.amazonaws.com",
      user: "ec2-user",
      identityFile: "~/.ssh/my-key.pem",
      port: "22",
      serverAliveInterval: "60",
      serverAliveCountMax: "3",
    },
  },
  {
    label: "Generic server",
    entry: {
      host: "my-server",
      hostname: "example.com",
      user: "deploy",
      port: "22",
      identityFile: "~/.ssh/id_ed25519",
      serverAliveInterval: "60",
      forwardAgent: false,
    },
  },
];

function generateConfig(entries: HostEntry[]): string {
  return entries
    .filter((e) => e.host.trim())
    .map((e) => {
      const lines: string[] = [`Host ${e.host.trim()}`];
      if (e.hostname.trim()) lines.push(`    HostName ${e.hostname.trim()}`);
      if (e.user.trim()) lines.push(`    User ${e.user.trim()}`);
      if (e.port.trim()) lines.push(`    Port ${e.port.trim()}`);
      if (e.identityFile.trim()) lines.push(`    IdentityFile ${e.identityFile.trim()}`);
      if (e.proxyJump.trim()) lines.push(`    ProxyJump ${e.proxyJump.trim()}`);
      if (e.forwardAgent) lines.push(`    ForwardAgent yes`);
      if (e.serverAliveInterval.trim()) lines.push(`    ServerAliveInterval ${e.serverAliveInterval.trim()}`);
      if (e.serverAliveCountMax.trim()) lines.push(`    ServerAliveCountMax ${e.serverAliveCountMax.trim()}`);
      if (e.compression) lines.push(`    Compression yes`);
      if (e.strictHostKeyChecking.trim()) lines.push(`    StrictHostKeyChecking ${e.strictHostKeyChecking.trim()}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="ml-1 font-normal opacity-60">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function SshConfigGeneratorTool() {
  const [entries, setEntries] = useState<HostEntry[]>([DEFAULT_ENTRY]);

  function updateEntry(id: string, patch: Partial<HostEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function addEmpty() {
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  function applyPreset(preset: Preset) {
    setEntries((prev) => [...prev, emptyEntry(preset.entry)]);
  }

  const output = useMemo(() => generateConfig(entries), [entries]);

  return (
    <div className="flex flex-col gap-6">
      {/* Presets */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Presets
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-transparent bg-muted px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Host entries */}
      <div className="flex flex-col gap-4">
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {entry.host.trim() || `Host ${idx + 1}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(entry.id)}
                disabled={entries.length === 1}
                aria-label="Remove host"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <FieldRow>
              <Field label="Host" hint="(alias)">
                <Input
                  value={entry.host}
                  onChange={(e) => updateEntry(entry.id, { host: e.target.value })}
                  placeholder="my-server"
                />
              </Field>
              <Field label="HostName" hint="(IP or domain)">
                <Input
                  value={entry.hostname}
                  onChange={(e) => updateEntry(entry.id, { hostname: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="User">
                <Input
                  value={entry.user}
                  onChange={(e) => updateEntry(entry.id, { user: e.target.value })}
                  placeholder="ubuntu"
                />
              </Field>
              <Field label="Port">
                <Input
                  value={entry.port}
                  onChange={(e) => updateEntry(entry.id, { port: e.target.value })}
                  placeholder="22"
                  type="number"
                  min={1}
                  max={65535}
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="IdentityFile">
                <Input
                  value={entry.identityFile}
                  onChange={(e) => updateEntry(entry.id, { identityFile: e.target.value })}
                  placeholder="~/.ssh/id_rsa"
                />
              </Field>
              <Field label="ProxyJump">
                <Input
                  value={entry.proxyJump}
                  onChange={(e) => updateEntry(entry.id, { proxyJump: e.target.value })}
                  placeholder="bastion-host"
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="ServerAliveInterval" hint="(seconds)">
                <Input
                  value={entry.serverAliveInterval}
                  onChange={(e) => updateEntry(entry.id, { serverAliveInterval: e.target.value })}
                  placeholder="60"
                  type="number"
                  min={0}
                />
              </Field>
              <Field label="ServerAliveCountMax">
                <Input
                  value={entry.serverAliveCountMax}
                  onChange={(e) => updateEntry(entry.id, { serverAliveCountMax: e.target.value })}
                  placeholder="3"
                  type="number"
                  min={0}
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="StrictHostKeyChecking">
                <Input
                  value={entry.strictHostKeyChecking}
                  onChange={(e) => updateEntry(entry.id, { strictHostKeyChecking: e.target.value })}
                  placeholder="accept-new"
                />
              </Field>
            </FieldRow>

            <div className="flex flex-wrap gap-4 pt-1">
              <Checkbox
                checked={entry.forwardAgent}
                onChange={(e) => updateEntry(entry.id, { forwardAgent: e.target.checked })}
                id={`forward-agent-${entry.id}`}
                label="ForwardAgent"
              />
              <Checkbox
                checked={entry.compression}
                onChange={(e) => updateEntry(entry.id, { compression: e.target.checked })}
                id={`compression-${entry.id}`}
                label="Compression"
              />
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addEmpty} className="self-start gap-1.5">
        <Plus className="h-4 w-4" />
        Add Host
      </Button>

      {/* Output */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">~/.ssh/config</span>
          <CopyButton value={output} label="" disabled={!output} />
        </div>
        <pre className="min-h-[100px] overflow-auto rounded-md border border-border bg-card px-3 py-2 font-mono text-xs leading-relaxed">
          {output || (
            <span className="text-muted-foreground">Fill in at least a Host alias to generate output.</span>
          )}
        </pre>
      </div>
    </div>
  );
}
