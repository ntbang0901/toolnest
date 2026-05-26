import type { ModelColumn, SchemaModel } from "../schema-model";
import { isBoolType, isDateType, isJsonType, isNumericType, isUuidType } from "../schema-model";
import { pascal, singularize } from "./shared";

function tsType(col: ModelColumn): string {
  if (col.enumName) return pascal(col.enumName);
  const t = col.baseType.toLowerCase();
  if (isUuidType(t)) return "string";
  if (isBoolType(t)) return "boolean";
  if (isJsonType(t)) return "any";
  if (isDateType(t)) return "Date";
  if (isNumericType(t)) return "number";
  return "string";
}

function typeormColumn(col: ModelColumn): string {
  const t = col.baseType.toLowerCase();
  let dec: string;
  if (col.pk && col.increment) dec = `@PrimaryGeneratedColumn()`;
  else if (col.pk && isUuidType(t)) dec = `@PrimaryGeneratedColumn("uuid")`;
  else if (col.pk) dec = `@PrimaryColumn()`;
  else {
    const opts: string[] = [];
    if (!col.notNull) opts.push("nullable: true");
    if (col.unique) opts.push("unique: true");
    if (col.default !== undefined) {
      if (col.defaultIsExpr) opts.push(`default: () => "${col.default}"`);
      else opts.push(`default: ${formatDefault(col.default, tsType(col))}`);
    }
    if (col.args && /varchar|char/i.test(t)) opts.push(`length: ${col.args}`);
    dec = opts.length ? `@Column({ ${opts.join(", ")} })` : `@Column()`;
  }
  return dec;
}

function formatDefault(v: string, ts: string): string {
  if (ts === "boolean") return v === "true" || v === "1" ? "true" : "false";
  if (ts === "number") return v;
  return `"${v}"`;
}

export function toTypeORM(model: SchemaModel): string {
  if (!model.tables.length) return "// no tables";
  const out: string[] = [];
  out.push(`import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, Index, ManyToOne, OneToMany, JoinColumn } from "typeorm";\n`);

  for (const t of model.tables) {
    const Name = pascal(singularize(t.name));
    if (t.indexes.some((i) => !i.pk)) {
      for (const idx of t.indexes) {
        if (idx.pk) continue;
        out.push(`@Index([${idx.columns.map((c) => `"${c}"`).join(", ")}]${idx.unique ? ", { unique: true }" : ""})`);
      }
    }
    out.push(`@Entity({ name: "${t.name}" })`);
    out.push(`export class ${Name} {`);
    for (const col of t.columns) {
      const optional = col.notNull || col.pk ? "" : " | null";
      out.push(`  ${typeormColumn(col)}`);
      out.push(`  ${col.name}!: ${tsType(col)}${optional};\n`);
    }
    for (const r of model.refs.filter((r) => r.fromTable === t.id)) {
      const target = model.tables.find((tt) => tt.id === r.toTable);
      if (!target) continue;
      const Target = pascal(singularize(target.name));
      const field = r.fromColumn.replace(/_id$/i, "") || target.name.toLowerCase();
      out.push(`  @ManyToOne(() => ${Target})`);
      out.push(`  @JoinColumn({ name: "${r.fromColumn}" })`);
      out.push(`  ${field}!: ${Target};\n`);
    }
    out.push(`}\n`);
  }
  return out.join("\n");
}

export function toSequelize(model: SchemaModel): string {
  if (!model.tables.length) return "// no tables";
  const out: string[] = [];
  out.push(`import { DataTypes, Model, Sequelize } from "sequelize";\n`);
  out.push(`export function defineModels(sequelize: Sequelize) {`);
  for (const t of model.tables) {
    const Name = pascal(singularize(t.name));
    out.push(`  const ${Name} = sequelize.define("${t.name}", {`);
    for (const col of t.columns) {
      out.push(`    ${col.name}: { ${seqColumn(col)} },`);
    }
    out.push(`  }, { tableName: "${t.name}", timestamps: false });`);
  }
  out.push("");
  for (const r of model.refs) {
    const A = pascal(singularize(model.tables.find((tt) => tt.id === r.fromTable)?.name ?? ""));
    const B = pascal(singularize(model.tables.find((tt) => tt.id === r.toTable)?.name ?? ""));
    if (!A || !B) continue;
    out.push(`  ${A}.belongsTo(${B}, { foreignKey: "${r.fromColumn}", targetKey: "${r.toColumn}" });`);
    out.push(`  ${B}.hasMany(${A}, { foreignKey: "${r.fromColumn}", sourceKey: "${r.toColumn}" });`);
  }
  out.push(`  return { ${model.tables.map((t) => pascal(singularize(t.name))).join(", ")} };`);
  out.push(`}`);
  return out.join("\n");
}

function seqColumn(col: ModelColumn): string {
  const t = col.baseType.toLowerCase();
  let type: string;
  if (col.enumName) type = `DataTypes.ENUM`;
  else if (isUuidType(t)) type = "DataTypes.UUID";
  else if (isBoolType(t)) type = "DataTypes.BOOLEAN";
  else if (isJsonType(t)) type = "DataTypes.JSONB";
  else if (isDateType(t)) type = "DataTypes.DATE";
  else if (isNumericType(t)) {
    if (/bigint/.test(t)) type = "DataTypes.BIGINT";
    else if (/decimal|numeric/.test(t)) type = "DataTypes.DECIMAL";
    else if (/float|double|real/.test(t)) type = "DataTypes.DOUBLE";
    else type = "DataTypes.INTEGER";
  } else if (/varchar|char/.test(t)) type = `DataTypes.STRING${col.args ? `(${col.args})` : ""}`;
  else type = "DataTypes.TEXT";
  const parts = [`type: ${type}`];
  if (col.pk) parts.push("primaryKey: true");
  if (col.increment) parts.push("autoIncrement: true");
  if (col.notNull && !col.pk) parts.push("allowNull: false");
  if (col.unique && !col.pk) parts.push("unique: true");
  if (col.default !== undefined) {
    if (col.defaultIsExpr) parts.push(`defaultValue: Sequelize.literal("${col.default}")`);
    else parts.push(`defaultValue: ${formatDefault(col.default, "string")}`);
  }
  return parts.join(", ");
}

export function toMongoose(model: SchemaModel): string {
  if (!model.tables.length) return "// no tables";
  const out: string[] = [];
  out.push(`import mongoose from "mongoose";`);
  out.push(`const { Schema } = mongoose;\n`);
  for (const t of model.tables) {
    const Name = pascal(singularize(t.name));
    out.push(`const ${Name}Schema = new Schema({`);
    for (const col of t.columns) {
      if (col.pk && col.name === "id") continue;
      out.push(`  ${col.name}: { ${mongoColumn(col, model)} },`);
    }
    out.push(`}, { timestamps: true });\n`);
    out.push(`export const ${Name} = mongoose.model("${Name}", ${Name}Schema);\n`);
  }
  return out.join("\n");
}

function mongoColumn(col: ModelColumn, model: SchemaModel): string {
  const ref = model.refs.find((r) => r.fromColumn === col.name);
  const t = col.baseType.toLowerCase();
  let mtype: string;
  if (ref) mtype = `type: Schema.Types.ObjectId, ref: "${pascal(singularize(model.tables.find((tt) => tt.id === ref.toTable)?.name ?? ""))}"`;
  else if (col.enumName) {
    const e = model.enums.find((x) => x.name === col.enumName);
    mtype = `type: String, enum: [${(e?.values ?? []).map((v) => `"${v.name}"`).join(", ")}]`;
  } else if (isBoolType(t)) mtype = "type: Boolean";
  else if (isJsonType(t)) mtype = "type: Schema.Types.Mixed";
  else if (isDateType(t)) mtype = "type: Date";
  else if (isNumericType(t)) mtype = "type: Number";
  else mtype = "type: String";
  const parts = [mtype];
  if (col.notNull) parts.push("required: true");
  if (col.unique) parts.push("unique: true");
  return parts.join(", ");
}
