import { RoleAuthPage } from "../_components/role-auth-page";

type TeacherLoginPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default function TeacherLoginPage({ searchParams }: TeacherLoginPageProps) {
  const next = searchParams?.next;
  const requestedNext = Array.isArray(next) ? next[0] : next;
  return <RoleAuthPage role="teacher" allowSms={false} requestedNext={requestedNext ?? null} />;
}
