import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

interface MimeEntry {
  ext: string[];
  mime: string;
  category: "text" | "image" | "video" | "audio" | "application" | "font";
}

const MIME_DB: MimeEntry[] = [
  { ext: ["html", "htm"], mime: "text/html", category: "text" },
  { ext: ["css"], mime: "text/css", category: "text" },
  { ext: ["js", "mjs"], mime: "text/javascript", category: "text" },
  { ext: ["ts"], mime: "text/typescript", category: "text" },
  { ext: ["jsx"], mime: "text/jsx", category: "text" },
  { ext: ["tsx"], mime: "text/tsx", category: "text" },
  { ext: ["json"], mime: "application/json", category: "application" },
  { ext: ["jsonld"], mime: "application/ld+json", category: "application" },
  { ext: ["xml"], mime: "application/xml", category: "application" },
  { ext: ["yaml", "yml"], mime: "application/yaml", category: "application" },
  { ext: ["csv"], mime: "text/csv", category: "text" },
  { ext: ["txt"], mime: "text/plain", category: "text" },
  { ext: ["md", "markdown"], mime: "text/markdown", category: "text" },
  { ext: ["pdf"], mime: "application/pdf", category: "application" },
  { ext: ["doc"], mime: "application/msword", category: "application" },
  { ext: ["docx"], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", category: "application" },
  { ext: ["xls"], mime: "application/vnd.ms-excel", category: "application" },
  { ext: ["xlsx"], mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", category: "application" },
  { ext: ["ppt"], mime: "application/vnd.ms-powerpoint", category: "application" },
  { ext: ["pptx"], mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", category: "application" },
  { ext: ["zip"], mime: "application/zip", category: "application" },
  { ext: ["tar"], mime: "application/x-tar", category: "application" },
  { ext: ["gz", "gzip"], mime: "application/gzip", category: "application" },
  { ext: ["bz2"], mime: "application/x-bzip2", category: "application" },
  { ext: ["7z"], mime: "application/x-7z-compressed", category: "application" },
  { ext: ["rar"], mime: "application/vnd.rar", category: "application" },
  { ext: ["png"], mime: "image/png", category: "image" },
  { ext: ["jpg", "jpeg"], mime: "image/jpeg", category: "image" },
  { ext: ["gif"], mime: "image/gif", category: "image" },
  { ext: ["svg"], mime: "image/svg+xml", category: "image" },
  { ext: ["webp"], mime: "image/webp", category: "image" },
  { ext: ["ico"], mime: "image/x-icon", category: "image" },
  { ext: ["bmp"], mime: "image/bmp", category: "image" },
  { ext: ["tiff", "tif"], mime: "image/tiff", category: "image" },
  { ext: ["avif"], mime: "image/avif", category: "image" },
  { ext: ["heic"], mime: "image/heic", category: "image" },
  { ext: ["mp3"], mime: "audio/mpeg", category: "audio" },
  { ext: ["wav"], mime: "audio/wav", category: "audio" },
  { ext: ["ogg"], mime: "audio/ogg", category: "audio" },
  { ext: ["flac"], mime: "audio/flac", category: "audio" },
  { ext: ["aac"], mime: "audio/aac", category: "audio" },
  { ext: ["m4a"], mime: "audio/mp4", category: "audio" },
  { ext: ["mp4"], mime: "video/mp4", category: "video" },
  { ext: ["webm"], mime: "video/webm", category: "video" },
  { ext: ["avi"], mime: "video/x-msvideo", category: "video" },
  { ext: ["mov"], mime: "video/quicktime", category: "video" },
  { ext: ["mkv"], mime: "video/x-matroska", category: "video" },
  { ext: ["wmv"], mime: "video/x-ms-wmv", category: "video" },
  { ext: ["flv"], mime: "video/x-flv", category: "video" },
  { ext: ["woff"], mime: "font/woff", category: "font" },
  { ext: ["woff2"], mime: "font/woff2", category: "font" },
  { ext: ["ttf"], mime: "font/ttf", category: "font" },
  { ext: ["otf"], mime: "font/otf", category: "font" },
  { ext: ["eot"], mime: "application/vnd.ms-fontobject", category: "font" },
  { ext: ["exe"], mime: "application/vnd.microsoft.portable-executable", category: "application" },
  { ext: ["dmg"], mime: "application/x-apple-diskimage", category: "application" },
  { ext: ["deb"], mime: "application/vnd.debian.binary-package", category: "application" },
  { ext: ["apk"], mime: "application/vnd.android.package-archive", category: "application" },
  { ext: ["sql"], mime: "application/sql", category: "application" },
  { ext: ["db", "sqlite", "sqlite3"], mime: "application/x-sqlite3", category: "application" },
  { ext: ["env"], mime: "text/plain", category: "text" },
  { ext: ["sh", "bash"], mime: "application/x-sh", category: "application" },
  { ext: ["py"], mime: "text/x-python", category: "text" },
  { ext: ["rb"], mime: "text/x-ruby", category: "text" },
  { ext: ["go"], mime: "text/x-go", category: "text" },
  { ext: ["rs"], mime: "text/x-rust", category: "text" },
  { ext: ["java"], mime: "text/x-java-source", category: "text" },
  { ext: ["php"], mime: "application/x-httpd-php", category: "application" },
  { ext: ["c"], mime: "text/x-csrc", category: "text" },
  { ext: ["cpp", "cc", "cxx"], mime: "text/x-c++src", category: "text" },
  { ext: ["h", "hpp"], mime: "text/x-chdr", category: "text" },
  { ext: ["cs"], mime: "text/x-csharp", category: "text" },
  { ext: ["swift"], mime: "text/x-swift", category: "text" },
  { ext: ["kt", "kts"], mime: "text/x-kotlin", category: "text" },
  { ext: ["dart"], mime: "text/x-dart", category: "text" },
  { ext: ["wasm"], mime: "application/wasm", category: "application" },
  { ext: ["map"], mime: "application/json", category: "application" },
  { ext: ["toml"], mime: "application/toml", category: "application" },
  { ext: ["ini", "cfg", "conf"], mime: "text/plain", category: "text" },
  { ext: ["log"], mime: "text/plain", category: "text" },
  { ext: ["rtf"], mime: "application/rtf", category: "application" },
  { ext: ["epub"], mime: "application/epub+zip", category: "application" },
  { ext: ["m3u8"], mime: "application/vnd.apple.mpegurl", category: "application" },
  { ext: ["ics"], mime: "text/calendar", category: "text" },
  { ext: ["vcf"], mime: "text/vcard", category: "text" },
  { ext: ["geojson"], mime: "application/geo+json", category: "application" },
  { ext: ["proto"], mime: "text/plain", category: "text" },
  { ext: ["graphql", "gql"], mime: "application/graphql", category: "application" },
];

const CATEGORY_COLORS: Record<string, string> = {
  text: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  image: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  video: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  audio: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  application: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  font: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export default function MimeLookupTool() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\./, "");
    if (!q) return [];

    const isLikelyMime = q.includes("/");
    const matches: MimeEntry[] = [];

    for (const entry of MIME_DB) {
      if (isLikelyMime) {
        if (entry.mime.includes(q)) matches.push(entry);
      } else {
        if (entry.ext.some((e) => e.includes(q)) || entry.mime.includes(q)) matches.push(entry);
      }
    }
    return matches.slice(0, 20);
  }, [query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Search by extension or MIME type</span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. pdf, image/jpeg, woff2, application/json…"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">
          Type a file extension (without dot) or a MIME type string — searches both ways.
        </p>
      </div>

      {query && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No matching MIME types found.</p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((entry, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[entry.category]}`}>
                    {entry.category}
                  </span>
                  <span className="font-mono text-sm font-medium">{entry.mime}</span>
                </div>
                <CopyButton value={entry.mime} label="" />
              </div>
              <div className="flex flex-wrap gap-1">
                {entry.ext.map((e) => (
                  <span key={e} className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                    .{e}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!query && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {["text", "image", "video", "audio", "application", "font"].map((cat) => {
            const count = MIME_DB.filter((e) => e.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setQuery(cat === "application" ? "application/" : cat + "/")}
                className={`flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-muted/50 transition-colors ${CATEGORY_COLORS[cat]}`}
              >
                <span className="font-medium capitalize">{cat}</span>
                <span className="font-mono text-xs opacity-70">{count} types</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
