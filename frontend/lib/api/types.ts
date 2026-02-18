export type HealthResponse = {
  status: "ok";
  service: string;
};

export type SendCodeRequest = {
  phone: string;
  role_hint?: "teacher" | "student";
};

export type SendCodeResponse = {
  request_id: string;
  expires_in: number;
};

export type LoginRequest = {
  phone: string;
  code: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    role: "teacher" | "student";
    phone: string;
    display_name: string;
  };
};
