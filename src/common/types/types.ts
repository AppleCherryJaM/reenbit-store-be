type ApiStatus = 'working' | 'error';
type DataBaseStatus = 'connected' | 'error';

export type HealthType = {
  status: number;
  api: ApiStatus;
  database: DataBaseStatus;
};

