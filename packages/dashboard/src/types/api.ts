export interface ConnectorStatus {
  name: string;
  configured: boolean;
  version: string;
  last_sync?: string;
  records_ingested?: number;
}

export interface ApiError {
  error: string;
  code?: string;
}
