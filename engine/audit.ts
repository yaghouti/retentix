import fs from 'node:fs';
import type { AuditEvent, AuditWriter } from './context.ts';

export class FileAuditWriter implements AuditWriter {
  constructor(private path: string) {}

  async record(event: AuditEvent) {
    fs.appendFileSync(this.path, `${JSON.stringify(event)}\n`);
  }
}
