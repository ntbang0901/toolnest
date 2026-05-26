import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

interface Result {
  dataUri: string;
  base64: string;
  size: number;
  type: string;
  name: string;
}

export default function ImageBase64Tool() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("File must be an image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Max 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = String(reader.result ?? "");
      const base64 = dataUri.split(",")[1] ?? "";
      setResult({ dataUri, base64, size: file.size, type: file.type, name: file.name });
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  };

  const cssBg = result ? `background-image: url("${result.dataUri}");` : "";
  const imgTag = result ? `<img src="${result.dataUri}" alt="" />` : "";

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-sm transition-colors ${
          drag ? "border-brand bg-brand/5" : "border-border bg-card text-muted-foreground hover:border-foreground/30"
        }`}
      >
        <Upload className="h-5 w-5" aria-hidden />
        <span>Drop an image here, or click to choose.</span>
        <span className="text-xs">PNG / JPG / SVG / GIF · up to 5 MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {result && (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-2">
            <div className="grid h-44 place-items-center overflow-hidden rounded-md border border-border bg-[conic-gradient(at_50%_50%,_#ddd_25%,_#fff_25%_50%,_#ddd_50%_75%,_#fff_75%)] bg-[length:16px_16px]">
              <img src={result.dataUri} alt={result.name} className="max-h-full max-w-full" />
            </div>
            <div className="text-xs text-muted-foreground">
              {result.name} · {(result.size / 1024).toFixed(1)} KB · {result.type}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
              Clear
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <Snippet label="Data URI" value={result.dataUri} />
            <Snippet label="Base64 only" value={result.base64} />
            <Snippet label="CSS background" value={cssBg} />
            <Snippet label="HTML img" value={imgTag} />
          </div>
        </div>
      )}
    </div>
  );
}

function Snippet({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CopyButton value={value} label="" />
      </div>
      <textarea
        readOnly
        value={value}
        className="h-20 w-full resize-none break-all rounded bg-transparent font-mono text-xs outline-none"
      />
    </div>
  );
}
