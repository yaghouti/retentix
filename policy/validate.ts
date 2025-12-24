import fs from "node:fs";
import yaml from "yaml";
import { PolicySchema } from "./schema.ts";

export function loadPolicy(path: string) {
  const raw = fs.readFileSync(path, "utf8");
  const parsed = yaml.parse(raw);
  return PolicySchema.parse(parsed);
}
