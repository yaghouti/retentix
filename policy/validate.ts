import fs from "fs";
import yaml from "yaml";
import { PolicySchema } from "./schema";

export function loadPolicy(path: string) {
  const raw = fs.readFileSync(path, "utf8");
  const parsed = yaml.parse(raw);
  return PolicySchema.parse(parsed);
}
