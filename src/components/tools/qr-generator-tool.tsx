import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Checkbox } from "@/components/ui/checkbox";

type Ecl = "L" | "M" | "Q" | "H";
type Tab = "text" | "wifi" | "email";

function escapeWifi(value: string): string {
  return value.replace(/([\\;,":])/g, "\\$1");
}

function buildWifi(ssid: string, password: string, encryption: "WPA" | "WEP" | "nopass", hidden: boolean): string {
  const e = encryption === "nopass" ? "" : encryption;
  return `WIFI:T:${e};S:${escapeWifi(ssid)};P:${escapeWifi(password)};${hidden ? "H:true;" : ""};`;
}

function buildEmail(to: string, subject: string, body: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${to}${qs ? `?${qs}` : ""}`;
}

export default function QrGeneratorTool() {
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("https://toolnest.dev");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [encryption, setEncryption] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [hidden, setHidden] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [ecl, setEcl] = useState<Ecl>("M");

  const data = useMemo(() => {
    if (tab === "wifi") {
      if (!ssid) return "";
      return buildWifi(ssid, password, encryption, hidden);
    }
    if (tab === "email") {
      if (!emailTo) return "";
      return buildEmail(emailTo, emailSubject, emailBody);
    }
    return text;
  }, [tab, text, ssid, password, encryption, hidden, emailTo, emailSubject, emailBody]);

  const [svgString, setSvgString] = useState("");
  const [size, setSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setSvgString("");
      setError(null);
      return;
    }
    try {
      const qr = qrcode(0, ecl);
      qr.addData(data);
      qr.make();
      const svg = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
      setSvgString(svg);
      setSize(qr.getModuleCount());
      setError(null);
    } catch (err) {
      setSvgString("");
      setError(err instanceof Error ? err.message : "Failed to render QR");
    }
  }, [data, ecl]);

  const downloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, "qrcode.svg");
    URL.revokeObjectURL(url);
  };

  const downloadPng = async () => {
    if (!data) return;
    const qr = qrcode(0, ecl);
    qr.addData(data);
    qr.make();
    const cell = 16;
    const margin = 2;
    const count = qr.getModuleCount();
    const px = (count + margin * 2) * cell;
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
      }
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    triggerDownload(url, "qrcode.png");
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <SegmentedControl
          ariaLabel="Content type"
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          className="w-full"
          options={[
            { value: "text", label: "Text / URL" },
            { value: "wifi", label: "Wi-Fi" },
            { value: "email", label: "Email" },
          ]}
        />

        {tab === "text" && (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type any text or paste a URL…"
            className="min-h-[160px] lg:min-h-[200px]"
            spellCheck={false}
          />
        )}

        {tab === "wifi" && (
          <div className="flex flex-col gap-3">
            <LabeledInput label="SSID" value={ssid} onChange={setSsid} placeholder="Network name" />
            <LabeledInput
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Leave empty for open networks"
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Encryption</span>
              <SegmentedControl
                ariaLabel="Encryption"
                value={encryption}
                onChange={(v) => setEncryption(v as "WPA" | "WEP" | "nopass")}
                className="w-full"
                options={[
                  { value: "WPA", label: "WPA" },
                  { value: "WEP", label: "WEP" },
                  { value: "nopass", label: "Open" },
                ]}
              />
            </div>
            <Checkbox
              label="Hidden network"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
            />
          </div>
        )}

        {tab === "email" && (
          <div className="flex flex-col gap-3">
            <LabeledInput label="To" value={emailTo} onChange={setEmailTo} placeholder="someone@example.com" />
            <LabeledInput label="Subject" value={emailSubject} onChange={setEmailSubject} placeholder="Optional" />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Body</span>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Optional"
                className="min-h-[100px]"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Error correction</span>
          <SegmentedControl
            ariaLabel="Error correction level"
            value={ecl}
            onChange={(v) => setEcl(v as Ecl)}
            className="w-full"
            options={[
              { value: "L", label: "L" },
              { value: "M", label: "M" },
              { value: "Q", label: "Q" },
              { value: "H", label: "H" },
            ]}
          />
          <p className="text-xs text-muted-foreground">L ≈ 7%, M ≈ 15%, Q ≈ 25%, H ≈ 30% recovery</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Preview {size > 0 && <span className="text-muted-foreground">({size}×{size} modules)</span>}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={downloadSvg} disabled={!svgString}>
              <Download className="h-4 w-4" />
              SVG
            </Button>
            <Button variant="outline" size="md" onClick={downloadPng} disabled={!data}>
              <Download className="h-4 w-4" />
              PNG
            </Button>
          </div>
        </div>
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-white p-6">
          {svgString ? (
            <div
              className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svgString }}
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              {error ?? "Enter content to generate a QR code"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function triggerDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
