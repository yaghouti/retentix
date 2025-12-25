import fs from 'node:fs';
import type { AuditEvent, AuditWriter } from './context.ts';

export class FileAuditWriter implements AuditWriter {
  private path: string;

  constructor(path: string) {
    this.path = path;
  }

  async record(event: AuditEvent) {
    fs.appendFileSync(this.path, `${JSON.stringify(event)}\n`);
  }
}
