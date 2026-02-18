export type HealthResponse = {
  status: "ok";
  service: string;
};

export type SendCodeRequest = {
  phone: string;
  role_hint: "teacher" | "student";
};

export type SendCodeResponse = {
  request_id: string;
  expires_in: number;
};

export type LoginRequest = {
  phone: string;
  code: string;
  display_name?: string;
};

export type UserProfile = {
  id: string;
  role: "teacher" | "student";
  phone: string;
  display_name: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
};

export type GradeBand = "primary" | "junior";

export type CreateClassRequest = {
  name: string;
  grade_band: GradeBand;
};

export type CreateClassResponse = {
  class_id: string;
  join_code: string;
};

export type ClassListItem = {
  class_id: string;
  name: string;
  grade_band: GradeBand;
  join_code: string;
};

export type JoinClassRequest = {
  join_code: string;
  student_name?: string;
};

export type JoinClassResponse = {
  class_id: string;
  class_name: string;
};

export type CreateAssignmentRequest = {
  class_id: string;
  title: string;
  prompt: string;
  due_at?: string;
};

export type CreateAssignmentResponse = {
  assignment_id: string;
  class_id: string;
  status: string;
};

export type AssignmentListItem = {
  assignment_id: string;
  class_id: string;
  title: string;
  prompt: string;
  due_at?: string | null;
  status: string;
};

export type SubmissionContentType = "text" | "image" | "document";

export type AssignmentSubmissionItem = {
  submission_id: string;
  student_id: string;
  student_name: string;
  content_type: SubmissionContentType;
  status: string;
  created_at: string;
  file_url?: string | null;
  text_excerpt?: string | null;
};

export type AssignmentDetailResponse = {
  assignment_id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  prompt: string;
  due_at?: string | null;
  status: string;
  created_at: string;
  submissions_count: number;
  submissions: AssignmentSubmissionItem[];
};

export type CreateCompositionSubmissionRequest = {
  assignment_id: string;
  content_type: SubmissionContentType;
  text_content?: string;
  file?: File;
};

export type CreateCompositionSubmissionResponse = {
  submission_id: string;
  assignment_id: string;
  class_id: string;
  student_id: string;
  content_type: SubmissionContentType;
  file_url?: string | null;
  status: string;
  created_at: string;
};
