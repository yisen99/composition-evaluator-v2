import { RoleAuthPage } from "../_components/role-auth-page";

type StudentLoginPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default function StudentLoginPage({ searchParams }: StudentLoginPageProps) {
  const next = searchParams?.next;
  const requestedNext = Array.isArray(next) ? next[0] : next;
  return <RoleAuthPage role="student" allowSms={true} requestedNext={requestedNext ?? null} />;
}
