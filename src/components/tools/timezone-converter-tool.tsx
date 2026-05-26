import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

const ALL_TIMEZONES = Intl.supportedValuesOf
  ? Intl.supportedValuesOf("timeZone")
  : [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Sao_Paulo",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Moscow",
      "Asia/Dubai",
      "Asia/Kolkata",
      "Asia/Bangkok",
      "Asia/Ho_Chi_Minh",
      "Asia/Singapore",
      "Asia/Shanghai",
      "Asia/Tokyo",
      "Asia/Seoul",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];

const DEFAULT_TARGETS = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Ho_Chi_Minh",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

function toLocalInputValue(date: Date, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    return "";
  }
}

function formatFull(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(date);
  } catch {
    return "—";
  }
}

function getOffset(date: Date, tz: string): string {
  try {
    const s = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value;
    return s ?? "";
  } catch {
    return "";
  }
}


export default function TimezoneConverterTool() {
  const [sourceTz, setSourceTz] = useState("UTC");
  const [tzSearch, setTzSearch] = useState("");
  const [datetimeInput, setDatetimeInput] = useState(() => {
    const now = new Date();
    return toLocalInputValue(now, "UTC");
  });

  const sourceDate = useMemo(() => {
    if (!datetimeInput) return new Date();
    // Parse the datetime-local value as if it's in sourceTz
    const [datePart, timePart = "00:00"] = datetimeInput.split("T");
    // Create a date string with timezone offset
    const isoGuess = `${datePart}T${timePart}:00`;
    const guessUtc = new Date(isoGuess);
    if (isNaN(guessUtc.getTime())) return new Date();
    // Adjust: find UTC time that gives this local time in sourceTz
    let ms = guessUtc.getTime();
    for (let i = 0; i < 5; i++) {
      const localStr = toLocalInputValue(new Date(ms), sourceTz);
      const localMs = new Date(localStr).getTime();
      ms += guessUtc.getTime() - localMs;
    }
    return new Date(ms);
  }, [datetimeInput, sourceTz]);

  const filteredTzs = useMemo(() => {
    const q = tzSearch.toLowerCase();
    return q ? ALL_TIMEZONES.filter((tz) => tz.toLowerCase().includes(q)) : ALL_TIMEZONES;
  }, [tzSearch]);

  const targets = DEFAULT_TARGETS.filter((tz) => tz !== sourceTz);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Date & Time</label>
          <input
            type="datetime-local"
            value={datetimeInput}
            onChange={(e) => setDatetimeInput(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Source Timezone</label>
          <select
            value={sourceTz}
            onChange={(e) => setSourceTz(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {ALL_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Conversions</span>
          <Input
            value={tzSearch}
            onChange={(e) => setTzSearch(e.target.value)}
            placeholder="Filter timezones…"
            className="h-7 w-48 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card">
          {(tzSearch ? filteredTzs : targets).slice(0, 30).map((tz) => {
            const formatted = formatFull(sourceDate, tz);
            const offset = getOffset(sourceDate, tz);
            return (
              <div
                key={tz}
                className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-0 text-sm"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{tz}</span>
                  <span className="text-xs text-muted-foreground">{offset}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs">{formatted}</span>
                  <CopyButton value={formatted} label="" />
                </div>
              </div>
            );
          })}
          {tzSearch && filteredTzs.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">No timezones match.</p>
          )}
        </div>
      </div>

      <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span className="text-muted-foreground">Unix timestamp: </span>
        <span className="font-mono">{Math.floor(sourceDate.getTime() / 1000)}</span>
        <CopyButton value={String(Math.floor(sourceDate.getTime() / 1000))} label="" />
      </div>
    </div>
  );
}
