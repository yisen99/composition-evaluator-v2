import { RoleAuthPage } from "../_components/role-auth-page";

export default function TeacherLoginPage() {
  return <RoleAuthPage role="teacher" allowSms={false} />;
}
