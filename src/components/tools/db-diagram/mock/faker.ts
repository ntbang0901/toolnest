import type { ModelColumn } from "../schema-model";
import { isBoolType, isDateType, isJsonType, isNumericType, isUuidType } from "../schema-model";
import {
  CITIES,
  COMPANIES,
  DOMAINS,
  FIRST_NAMES,
  LAST_NAMES,
  LOREM,
  STREETS,
  type RNG,
} from "./rng";

export type FieldKind =
  | "id"
  | "uuid"
  | "email"
  | "username"
  | "first_name"
  | "last_name"
  | "full_name"
  | "phone"
  | "url"
  | "avatar"
  | "address"
  | "city"
  | "country"
  | "company"
  | "title"
  | "slug"
  | "description"
  | "price"
  | "quantity"
  | "age"
  | "rating"
  | "lat"
  | "lng"
  | "ip"
  | "color"
  | "status"
  | "boolean"
  | "json"
  | "date"
  | "datetime"
  | "time"
  | "integer"
  | "float"
  | "decimal"
  | "text"
  | "string"
  | "enum"
  | "default";

export function inferKind(col: ModelColumn): FieldKind {
  const n = col.name.toLowerCase();
  if (col.enumName) return "enum";
  if (col.pk && col.increment) return "id";
  if (isUuidType(col.baseType)) return "uuid";
  if (/email/.test(n)) return "email";
  if (/username|handle/.test(n)) return "username";
  if (/first_?name|given/.test(n)) return "first_name";
  if (/last_?name|surname|family/.test(n)) return "last_name";
  if (/^name$|full_?name|display_?name/.test(n)) return "full_name";
  if (/phone|mobile|tel/.test(n)) return "phone";
  if (/avatar|photo|image_?url|picture/.test(n)) return "avatar";
  if (/url|website|homepage|link/.test(n)) return "url";
  if (/^address|street/.test(n)) return "address";
  if (/^city/.test(n)) return "city";
  if (/country/.test(n)) return "country";
  if (/company|org|organization/.test(n)) return "company";
  if (/title|subject/.test(n)) return "title";
  if (/slug/.test(n)) return "slug";
  if (/description|bio|about|body|content|note/.test(n)) return "description";
  if (/price|amount|cost|total|fee/.test(n)) return "price";
  if (/quantity|qty|count|stock/.test(n)) return "quantity";
  if (/^age$/.test(n)) return "age";
  if (/rating|score/.test(n)) return "rating";
  if (/^lat|latitude/.test(n)) return "lat";
  if (/^lng|^lon|longitude/.test(n)) return "lng";
  if (/^ip(_|$)/.test(n)) return "ip";
  if (/color/.test(n)) return "color";
  if (/status|state/.test(n)) return "status";

  if (isBoolType(col.baseType)) return "boolean";
  if (isJsonType(col.baseType)) return "json";
  if (isDateType(col.baseType)) {
    if (/^date$/i.test(col.baseType)) return "date";
    if (/^time$/i.test(col.baseType)) return "time";
    return "datetime";
  }
  if (isNumericType(col.baseType)) {
    if (/decimal|numeric/i.test(col.baseType)) return "decimal";
    if (/float|double|real/i.test(col.baseType)) return "float";
    return "integer";
  }
  if (/text|clob/i.test(col.baseType)) return "text";
  return "string";
}

export function fakeValue(kind: FieldKind, col: ModelColumn, rng: RNG, rowIdx: number, enumValues: string[]): unknown {
  const max = col.args ? Math.max(1, parseInt(col.args.split(",")[0], 10) || 50) : 50;
  switch (kind) {
    case "id":
      return rowIdx + 1;
    case "uuid":
      return uuidv4(rng);
    case "email": {
      const fn = rng.pick(FIRST_NAMES).toLowerCase();
      const ln = rng.pick(LAST_NAMES).toLowerCase();
      const dom = rng.pick(DOMAINS);
      return `${fn}.${ln}${rng.int(1, 999)}@${dom}`;
    }
    case "username": {
      const fn = rng.pick(FIRST_NAMES).toLowerCase();
      return `${fn}${rng.int(10, 9999)}`;
    }
    case "first_name":
      return rng.pick(FIRST_NAMES);
    case "last_name":
      return rng.pick(LAST_NAMES);
    case "full_name":
      return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    case "phone":
      return `+84${rng.int(900000000, 999999999)}`;
    case "url":
      return `https://${rng.pick(DOMAINS)}/${rng.pick(["docs", "blog", "about", "user"])}/${rng.int(1, 9999)}`;
    case "avatar":
      return `https://i.pravatar.cc/150?img=${rng.int(1, 70)}`;
    case "address":
      return `${rng.int(1, 9999)} ${rng.pick(STREETS)} St`;
    case "city":
      return rng.pick(CITIES);
    case "country":
      return rng.pick(["Vietnam", "Singapore", "Japan", "USA", "Germany", "France"]);
    case "company":
      return rng.pick(COMPANIES);
    case "title": {
      const t = `${capitalize(rng.pick(["amazing", "incredible", "essential", "modern", "advanced"]))} ${rng.pick(["guide", "intro", "deep dive", "review"])} to ${rng.pick(["coding", "design", "marketing", "AI"])}`;
      return clipString(t, max);
    }
    case "slug":
      return `${rng.pick(["hello", "post", "blog", "item"])}-${rng.int(1, 9999)}`;
    case "description":
      return clipString(rng.pick(LOREM), max);
    case "price":
      return Math.round(rng.next() * 999900) / 100;
    case "quantity":
      return rng.int(1, 1000);
    case "age":
      return rng.int(18, 80);
    case "rating":
      return Math.round(rng.next() * 50) / 10;
    case "lat":
      return Math.round((rng.next() * 180 - 90) * 1e6) / 1e6;
    case "lng":
      return Math.round((rng.next() * 360 - 180) * 1e6) / 1e6;
    case "ip":
      return `${rng.int(1, 255)}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(0, 255)}`;
    case "color":
      return "#" + rng.int(0, 0xffffff).toString(16).padStart(6, "0");
    case "status":
      return rng.pick(["active", "pending", "archived", "draft"]);
    case "boolean":
      return rng.bool();
    case "json":
      return { id: rng.int(1, 999), tag: rng.pick(["alpha", "beta", "stable"]) };
    case "date":
      return formatDate(randomDate(rng), "date");
    case "datetime":
      return formatDate(randomDate(rng), "datetime");
    case "time":
      return `${pad(rng.int(0, 23))}:${pad(rng.int(0, 59))}:${pad(rng.int(0, 59))}`;
    case "integer":
      return rng.int(1, 10000);
    case "float":
      return Math.round(rng.next() * 100000) / 100;
    case "decimal":
      return Math.round(rng.next() * 100000) / 100;
    case "text":
      return clipString(rng.pick(LOREM), max);
    case "enum":
      return enumValues.length ? rng.pick(enumValues) : null;
    default:
      return clipString(`val_${rowIdx}_${col.name}`, max);
  }
}

function clipString(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function randomDate(rng: RNG): Date {
  const start = Date.UTC(2020, 0, 1);
  const end = Date.UTC(2026, 0, 1);
  return new Date(start + rng.next() * (end - start));
}

function formatDate(d: Date, kind: "date" | "datetime"): string {
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  if (kind === "date") return date;
  return `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function uuidv4(rng: RNG): string {
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) s += "-";
    if (i === 12) s += "4";
    else if (i === 16) s += hex[(rng.int(0, 15) & 0x3) | 0x8];
    else s += hex[rng.int(0, 15)];
  }
  return s;
}
