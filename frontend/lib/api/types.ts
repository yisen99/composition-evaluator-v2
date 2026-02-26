export type HealthResponse = {
  status: "ok";
  service: string;
};

export type UserRole = "teacher" | "student";

export type SendCodeRequest = {
  phone: string;
  role_hint: UserRole;
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
  role: UserRole;
  available_roles: UserRole[];
  last_active_role: UserRole;
  phone: string;
  display_name: string;
};

export type AccountRegisterRequest = {
  email: string;
  password: string;
  role: UserRole;
  display_name: string;
  phone?: string;
};

export type AccountRegisterResponse = {
  id: string;
  email: string;
  role: UserRole;
  display_name: string;
  phone?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
};

export type RefreshTokenRequest = {
  refresh_token: string;
};

export type WechatAuthorizeResponse = {
  authorization_url: string;
  state: string;
};

export type WechatAuthPayload = {
  role: UserRole;
  next_path?: string | null;
  need_bind_phone: boolean;
  bind_ticket?: string | null;
  bind_expires_in?: number | null;
  wechat_nickname?: string | null;
  wechat_avatar_url?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  user?: UserProfile | null;
};

export type WechatBindSendCodeRequest = {
  bind_ticket: string;
  phone: string;
};

export type WechatBindPhoneRequest = {
  bind_ticket: string;
  phone: string;
  code: string;
  display_name?: string;
};

export type AuthRolesResponse = {
  active_role: UserRole;
  available_roles: UserRole[];
};

export type SwitchRoleRequest = {
  target_role: UserRole;
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

export type TeacherAssignmentBatchAction = "enter_workflow" | "publish_reminder" | "advance_status";
export type TeacherAssignmentTargetStatus = "published" | "closed";

export type TeacherAssignmentBatchActionRequest = {
  assignment_ids: string[];
  action: TeacherAssignmentBatchAction;
  target_status?: TeacherAssignmentTargetStatus;
};

export type TeacherAssignmentBatchActionResultItem = {
  assignment_id: string;
  title?: string | null;
  class_id?: string | null;
  status: "success" | "failed";
  detail: string;
  detail_path?: string | null;
  before_status?: string | null;
  after_status?: string | null;
  reminder_target_count?: number | null;
};

export type TeacherAssignmentBatchActionResponse = {
  action: TeacherAssignmentBatchAction;
  total: number;
  succeeded: number;
  failed: number;
  workflow_assignment_ids: string[];
  results: TeacherAssignmentBatchActionResultItem[];
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

export type StudentSubmissionListItem = {
  submission_id: string;
  assignment_id: string;
  assignment_title: string;
  class_id: string;
  class_name: string;
  content_type: SubmissionContentType;
  status: string;
  created_at: string;
  due_at?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  text_excerpt?: string | null;
};

export type StudentManualFeedbackItem = {
  submission_id: string;
  assignment_id: string;
  assignment_title: string;
  class_id: string;
  class_name: string;
  content_type: SubmissionContentType;
  created_at: string;
  manual_total_score: number;
  structure_score: number;
  language_score: number;
  value_score: number;
  summary_feedback: string;
  actionable_suggestions: string[];
  strengths?: string | null;
  next_goal?: string | null;
  manual_published_at?: string | null;
  manual_view_count?: number;
  manual_first_viewed_at?: string | null;
  manual_last_viewed_at?: string | null;
  has_unread_teacher_reply?: boolean;
  unread_teacher_reply_count?: number;
  latest_teacher_reply_at?: string | null;
  agent_summary?: {
    total_score?: number | null;
    radar: {
      structure?: number | null;
      language?: number | null;
      value?: number | null;
    };
    items: {
      agent_name: "structure" | "language" | "value";
      score: number;
      feedback: string;
      created_at: string;
    }[];
  } | null;
};

export type MarkManualFeedbackReadResponse = {
  marked_count: number;
};

export type ManualReviewStatus = "draft" | "published";
export type ManualReviewQueueStatus = "none" | "draft" | "published";
export type ManualReviewReplyAuthorRole = "teacher" | "student";

export type ManualReviewItem = {
  review_id: string;
  submission_id: string;
  assignment_id: string;
  class_id: string;
  student_id: string;
  teacher_id: string;
  structure_score: number;
  language_score: number;
  value_score: number;
  total_score: number;
  summary_feedback: string;
  actionable_suggestions: string[];
  strengths?: string | null;
  next_goal?: string | null;
  status: ManualReviewStatus;
  version: number;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
};

export type ManualReviewSubmissionResponse = {
  submission_id: string;
  exists: boolean;
  review?: ManualReviewItem | null;
};

export type ManualReviewDraftRequest = {
  submission_id: string;
  structure_score: number;
  language_score: number;
  value_score: number;
  summary_feedback: string;
  actionable_suggestions: string[];
  strengths?: string;
  next_goal?: string;
};

export type ManualReviewPublishRequest = {
  submission_id: string;
};

export type ManualReviewReplyItem = {
  reply_id: string;
  manual_review_id: string;
  submission_id: string;
  assignment_id: string;
  class_id: string;
  student_id: string;
  teacher_id: string;
  author_role: ManualReviewReplyAuthorRole;
  author_id: string;
  content: string;
  created_at: string;
};

export type StudentManualReviewReplyCreateRequest = {
  submission_id: string;
  content: string;
};

export type TeacherManualReviewReplyCreateRequest = {
  content: string;
};

export type AssignmentGradingQueueItem = {
  submission_id: string;
  student_id: string;
  student_name: string;
  content_type: SubmissionContentType;
  submitted_at: string;
  manual_status: ManualReviewQueueStatus;
  manual_total_score?: number | null;
  manual_updated_at?: string | null;
  manual_published_at?: string | null;
  manual_viewed: boolean;
  manual_view_count: number;
  manual_first_viewed_at?: string | null;
  manual_last_viewed_at?: string | null;
  reply_total_count: number;
  student_reply_count: number;
  teacher_reply_count: number;
  pending_teacher_reply: boolean;
  last_reply_role?: "teacher" | "student" | null;
  last_reply_at?: string | null;
};

export type AssignmentGradingQueueResponse = {
  assignment_id: string;
  class_id: string;
  total_submissions: number;
  manual_draft_count: number;
  manual_published_count: number;
  items: AssignmentGradingQueueItem[];
};

export type AssignmentCommunicationStudentItem = {
  student_id: string;
  student_name: string;
  submission_ids: string[];
  reply_total_count: number;
  student_reply_count: number;
  teacher_reply_count: number;
  pending_teacher_reply_count: number;
  pending_student_reply_count: number;
  unread_by_student_reply_count: number;
  latest_reply_role?: "teacher" | "student" | null;
  latest_reply_content?: string | null;
  latest_reply_at?: string | null;
};

export type AssignmentCommunicationThreadsResponse = {
  assignment_id: string;
  class_id: string;
  total_students: number;
  total_replies: number;
  total_pending_teacher_replies: number;
  total_unread_by_students: number;
  items: AssignmentCommunicationStudentItem[];
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

export type UxEventTrackRequest = {
  event_name: string;
  event_category: string;
  page?: string;
  properties?: Record<string, unknown>;
};

export type UxEventTrackResponse = {
  event_id: string;
  created_at: string;
};

export type UxEventMetricItem = {
  event_name: string;
  count: number;
};

export type UxMetricsSummaryResponse = {
  days: number;
  total_events: number;
  active_user_count: number;
  teacher_task_center_view_count: number;
  teacher_batch_action_count: number;
  student_todo_click_count: number;
  event_breakdown: UxEventMetricItem[];
};

export type StudentOnboardingRequest = {
  real_name: string;
  grade: string;
  city: string;
  gender: "male" | "female" | "other";
  password: string;
};

export type StudentOnboardingResponse = {
  onboarding_completed: boolean;
  next_action: string;
};

export type TeacherSubmissionDetail = {
  submission_id: string;
  assignment_id: string;
  assignment_title: string;
  class_id: string;
  class_name: string;
  student_id: string;
  student_name: string;
  content_type: SubmissionContentType;
  text_content: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string;
  created_at: string;
};

export type GradingData = {
  structure_score: number;
  language_score: number;
  value_score: number;
  summary_feedback: string;
  actionable_suggestions: string[];
  strengths?: string;
  next_goal?: string;
};
