export interface JwtPayload {
	email: string;
	sub: number;
	name: string;
	role: string;
}

export interface JwtCreatePayload {
  email: string;
  sub: number;
  name: string;
  role: string;
}

export interface JwtDecodedPayload extends JwtCreatePayload {
  exp: number;
  iat: number;
}

export interface AuthResponse {
	access_token: string;
	refresh_token: string;
	user: {
		id: number;
		email: string;
		name: string;
		role: string;
		avatarUrl?: string;
	};
}

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
}
