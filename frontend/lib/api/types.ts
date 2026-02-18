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

export type GradeBand = "primary" | "junior";

export type CreateClassRequest = {
  teacher_id: string;
  teacher_name: string;
  name: string;
  grade_band: GradeBand;
};

export type CreateClassResponse = {
  class_id: string;
  join_code: string;
};

export type JoinClassRequest = {
  join_code: string;
  student_id: string;
  student_name: string;
};

export type JoinClassResponse = {
  class_id: string;
  class_name: string;
};

export type CreateAssignmentRequest = {
  class_id: string;
  teacher_id: string;
  title: string;
  prompt: string;
  due_at?: string;
};

export type CreateAssignmentResponse = {
  assignment_id: string;
  class_id: string;
  status: string;
};
