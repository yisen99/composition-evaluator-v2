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
  latest_agent_name?: string | null;
  latest_review_score?: number | null;
  latest_review_feedback?: string | null;
  latest_memory_note?: string | null;
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

export type ReviewAgentName = "structure" | "language" | "value";

export type RunSubmissionReviewRequest = {
  submission_id: string;
  agent_name: ReviewAgentName;
};

export type RunSubmissionReviewResponse = {
  review_id: string;
  submission_id: string;
  assignment_id: string;
  class_id: string;
  student_id: string;
  teacher_id: string;
  agent_name: ReviewAgentName;
  score: number;
  feedback: string;
  rewrite_suggestions: string[];
  memory_note_id: string;
  status: string;
  created_at: string;
};

export type StudentMemoryItem = {
  note_id: string;
  student_id: string;
  teacher_id: string;
  class_id: string;
  source_submission_id: string;
  source_review_id: string;
  agent_name: string;
  note: string;
  tags: string;
  status: string;
  created_at: string;
};

export type StudentMemoryResponse = {
  student_id: string;
  total: number;
  items: StudentMemoryItem[];
};

export type ReviewSummaryRequest = {
  submission_id: string;
};

export type ReviewSummaryItem = {
  agent_name: ReviewAgentName;
  score: number;
  feedback: string;
};

export type ReviewSummaryResponse = {
  submission_id: string;
  assignment_id: string;
  class_id: string;
  student_id: string;
  total_score: number;
  radar: {
    structure: number;
    language: number;
    value: number;
  };
  items: ReviewSummaryItem[];
  actionable_suggestions: string[];
  rewrite_paragraph: string;
};

export type StudentProgressSubmissionItem = {
  submission_id: string;
  assignment_id: string;
  assignment_title: string;
  class_id: string;
  class_name: string;
  content_type: SubmissionContentType;
  submitted_at: string;
  structure_score?: number | null;
  language_score?: number | null;
  value_score?: number | null;
  total_score?: number | null;
};

export type StudentProgressPoint = {
  index: number;
  submitted_at: string;
  total_score?: number | null;
};

export type StudentProgressResponse = {
  student_id: string;
  total_submissions: number;
  latest_score?: number | null;
  average_score?: number | null;
  best_score?: number | null;
  score_delta_from_first?: number | null;
  trajectory: StudentProgressPoint[];
  submissions: StudentProgressSubmissionItem[];
};
