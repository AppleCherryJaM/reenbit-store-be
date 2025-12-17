type ApiStatus = 'working' | 'error';
type DataBaseStatus = 'connected' | 'error';

export type UserRole = 'USER' | 'ADMIN';

export type HealthType = {
	status: number,
	api: ApiStatus,
	database: DataBaseStatus
}