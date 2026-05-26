import type { ModelColumn, SchemaModel } from "../schema-model";
import { isBoolType, isDateType, isJsonType, isNumericType, isUuidType } from "../schema-model";
import { pascal, singularize } from "./shared";

function pyType(col: ModelColumn): string {
  if (col.enumName) return pascal(col.enumName);
  const t = col.baseType.toLowerCase();
  if (isUuidType(t)) return "UUID";
  if (isBoolType(t)) return "Boolean";
  if (isJsonType(t)) return "JSONB";
  if (isDateType(t)) {
    if (/timestamp/i.test(t)) return "DateTime";
    if (/^date$/i.test(t)) return "Date";
    return "Time";
  }
  if (isNumericType(t)) {
    if (/bigint/.test(t)) return "BigInteger";
    if (/decimal|numeric/.test(t)) return "Numeric";
    if (/float|double|real/.test(t)) return "Float";
    return "Integer";
  }
  if (/varchar|char/.test(t)) return col.args ? `String(${col.args.split(",")[0]})` : "String";
  return "Text";
}

function pyHint(col: ModelColumn): string {
  const t = col.baseType.toLowerCase();
  let h: string;
  if (col.enumName) h = pascal(col.enumName);
  else if (isUuidType(t)) h = "uuid.UUID";
  else if (isBoolType(t)) h = "bool";
  else if (isJsonType(t)) h = "dict";
  else if (isDateType(t)) h = "datetime";
  else if (isNumericType(t)) h = /int/.test(t) ? "int" : "float";
  else h = "str";
  if (!col.notNull && !col.pk) h = `Optional[${h}]`;
  return h;
}

export function toSQLAlchemy(model: SchemaModel): string {
  if (!model.tables.length) return "# no tables";
  const out: string[] = [];
  out.push(`# SQLAlchemy 2.x style with Mapped/mapped_column`);
  out.push(`from __future__ import annotations`);
  out.push(`import uuid`);
  out.push(`from datetime import datetime`);
  out.push(`from typing import Optional, List`);
  out.push(`from sqlalchemy import String, Integer, BigInteger, Float, Numeric, Boolean, DateTime, Date, Time, Text, ForeignKey`);
  out.push(`from sqlalchemy.dialects.postgresql import UUID, JSONB`);
  out.push(`from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship\n`);
  out.push(`class Base(DeclarativeBase):`);
  out.push(`    pass\n`);

  for (const e of model.enums) {
    out.push(`# enum ${e.name}: ${e.values.map((v) => v.name).join(", ")}`);
  }

  for (const t of model.tables) {
    const Cls = pascal(singularize(t.name));
    out.push(`class ${Cls}(Base):`);
    out.push(`    __tablename__ = "${t.name}"`);
    for (const col of t.columns) {
      const hint = pyHint(col);
      const args: string[] = [pyType(col)];
      const fk = model.refs.find((r) => r.fromTable === t.id && r.fromColumn === col.name);
      if (fk) {
        const target = model.tables.find((tt) => tt.id === fk.toTable);
        if (target) args.push(`ForeignKey("${target.name}.${fk.toColumn}")`);
      }
      const opts: string[] = [];
      if (col.pk) opts.push("primary_key=True");
      if (col.increment) opts.push("autoincrement=True");
      if (col.unique && !col.pk) opts.push("unique=True");
      if (!col.notNull && !col.pk) opts.push("nullable=True");
      else if (col.notNull) opts.push("nullable=False");
      if (col.default !== undefined && !col.defaultIsExpr) {
        opts.push(`default=${pyDefault(col.default, hint)}`);
      } else if (col.defaultIsExpr) {
        opts.push(`server_default=text("${col.default}")`);
      }
      out.push(`    ${col.name}: Mapped[${hint}] = mapped_column(${args.join(", ")}${opts.length ? ", " + opts.join(", ") : ""})`);
    }
    for (const r of model.refs.filter((r) => r.fromTable === t.id)) {
      const target = model.tables.find((tt) => tt.id === r.toTable);
      if (!target) continue;
      const Target = pascal(singularize(target.name));
      const attr = r.fromColumn.replace(/_id$/i, "") || target.name.toLowerCase();
      out.push(`    ${attr}: Mapped["${Target}"] = relationship(foreign_keys=[${r.fromColumn}])`);
    }
    out.push("");
  }
  return out.join("\n");
}

function pyDefault(v: string, hint: string): string {
  if (hint.includes("bool")) return v === "true" || v === "1" ? "True" : "False";
  if (hint.includes("int") || hint.includes("float")) return v;
  return `"${v}"`;
}
