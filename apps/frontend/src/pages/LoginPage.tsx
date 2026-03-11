import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role } from '@api/dtos/enums';

const roleRedirect = (role: Role) =>
  role === Role.ADMIN ? '/admin/home' : '/recruiter/home';

const RedirectByRole: React.FC = () => {
  const [isLoading, isError, user] = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (isError || !user)
    return <div>Unable to load user. Please try again.</div>;
  return <Navigate to={roleRedirect(user.role)} replace />;
};

const LoginPage: React.FC = () => {
  const [isLoading, , user] = useAuth();

  if (isLoading) return null;

  if (user) {
    return <Navigate to={roleRedirect(user.role)} replace />;
  }

  return <Authenticator hideSignUp>{() => <RedirectByRole />}</Authenticator>;
};

export default LoginPage;
