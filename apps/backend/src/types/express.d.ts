export type Role = 'LANDLORD' | 'TENANT';

export type JwtPayload = {
  sub: string;
  role: Role;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}
