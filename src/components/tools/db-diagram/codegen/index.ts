import type { SchemaModel } from "../schema-model";
import { toPrisma } from "./prisma";
import { toDrizzle } from "./drizzle";
import { toTypeScript, toZod, toJsonSchema } from "./typescript";
import { toTypeORM, toSequelize, toMongoose } from "./orm-extras";
import { toSQLAlchemy } from "./sqlalchemy";
import { toGraphQL, toMermaid, toDot, toPlantUml } from "./diagrams";

export type GenTarget =
  | "prisma"
  | "drizzle"
  | "typeorm"
  | "sequelize"
  | "mongoose"
  | "sqlalchemy"
  | "typescript"
  | "zod"
  | "json-schema"
  | "graphql"
  | "mermaid"
  | "dot"
  | "plantuml";

export interface GenSpec {
  id: GenTarget;
  label: string;
  group: "ORM" | "Schema" | "Diagram";
  language: string;
  generate: (model: SchemaModel) => string;
}

export const GENERATORS: GenSpec[] = [
  { id: "prisma", label: "Prisma", group: "ORM", language: "prisma", generate: toPrisma },
  { id: "drizzle", label: "Drizzle", group: "ORM", language: "typescript", generate: toDrizzle },
  { id: "typeorm", label: "TypeORM", group: "ORM", language: "typescript", generate: toTypeORM },
  { id: "sequelize", label: "Sequelize", group: "ORM", language: "typescript", generate: toSequelize },
  { id: "mongoose", label: "Mongoose", group: "ORM", language: "typescript", generate: toMongoose },
  { id: "sqlalchemy", label: "SQLAlchemy", group: "ORM", language: "python", generate: toSQLAlchemy },
  { id: "typescript", label: "TypeScript", group: "Schema", language: "typescript", generate: toTypeScript },
  { id: "zod", label: "Zod", group: "Schema", language: "typescript", generate: toZod },
  { id: "json-schema", label: "JSON Schema", group: "Schema", language: "json", generate: toJsonSchema },
  { id: "graphql", label: "GraphQL", group: "Schema", language: "graphql", generate: toGraphQL },
  { id: "mermaid", label: "Mermaid ER", group: "Diagram", language: "mermaid", generate: toMermaid },
  { id: "dot", label: "Graphviz DOT", group: "Diagram", language: "dot", generate: toDot },
  { id: "plantuml", label: "PlantUML", group: "Diagram", language: "plantuml", generate: toPlantUml },
];

export function generate(target: GenTarget, model: SchemaModel): string {
  const gen = GENERATORS.find((g) => g.id === target);
  if (!gen) return `// unknown target: ${target}`;
  try {
    return gen.generate(model);
  } catch (err) {
    return `// generator error: ${err instanceof Error ? err.message : "unknown"}`;
  }
}
