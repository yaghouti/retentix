export interface LicensePayload {
  customer: string;
  environments: string[];
  expires_at: string;
  features: Array<'retention' | 'erasure' | 'masking'>;
  max_runs_per_day?: number;
  issued_at: string;
}
