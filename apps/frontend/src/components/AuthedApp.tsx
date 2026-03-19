import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role } from '@api/dtos/enums';
import { CompleteProfileModal } from './CompleteProfileModal';

const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [Role.ADMIN]: [Role.ADMIN],
  [Role.RECRUITER]: [Role.RECRUITER],
};

interface AuthedAppProps {
  allowedRoles: Role[];
}

export const AuthedApp: React.FC<AuthedAppProps> = ({ allowedRoles }) => {
  const [isLoading, isError, user] = useAuth();
  const [profileCompleted, setProfileCompleted] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Unable to load user. Please try again.</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = ROLE_HIERARCHY[user.role] ?? [];
  const hasAccess = allowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    if (user.role === Role.RECRUITER) {
      return <Navigate to="/recruiter/home" replace />;
    }
    if (user.role === Role.ADMIN) {
      return <Navigate to="/admin/home" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  const profileIncomplete =
    !profileCompleted && (user.firstName === null || user.lastName === null);

  return (
    <>
      <Outlet />
      <CompleteProfileModal
        open={profileIncomplete}
        user={user}
        onComplete={() => setProfileCompleted(true)}
      />
    </>
  );
};

export default AuthedApp;
