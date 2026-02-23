export interface User {
  id: number;
  username: string;
  name: string;
  role: 'teacher' | 'student';
  region?: string;
  grade?: string;
  long_term_memory?: string;
  isNewUser?: boolean;
}

export interface Task {
  id: number;
  teacher_id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
  created_at: string;
  submission_count?: number;
  total_students?: number;
  submission_status?: string;
  score?: number;
  submission_id?: number;
}

export interface Submission {
  id: number;
  task_id: number;
  student_id: number;
  student_name: string;
  task_title: string;
  content: string;
  score: number | null;
  ai_feedback: string | null;
  teacher_feedback: string | null;
  status: 'pending' | 'corrected';
  submitted_at: string;
  threads?: FeedbackThread[];
}

export interface FeedbackThread {
  id: number;
  submission_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: 'teacher' | 'student';
  message: string;
  created_at: string;
}
