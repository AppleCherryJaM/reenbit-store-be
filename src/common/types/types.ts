type ApiStatus = 'working' | 'error';
type DataBaseStatus = 'connected' | 'error';

export enum UserRole {
  'USER',
  'ADMIN',
}

export type HealthType = {
  status: number;
  api: ApiStatus;
  database: DataBaseStatus;
};
