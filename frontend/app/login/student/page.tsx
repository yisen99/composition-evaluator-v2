import { RoleAuthPage } from "../_components/role-auth-page";

export default function StudentLoginPage() {
  return <RoleAuthPage role="student" allowSms={true} />;
}
