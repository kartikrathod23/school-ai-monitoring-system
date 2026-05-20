export interface LoginResponse {
  token: string;

  user: {
    id: string;
    userCode: string;
    role: string;
  };
}