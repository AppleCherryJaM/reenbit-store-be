export interface VerificationPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}