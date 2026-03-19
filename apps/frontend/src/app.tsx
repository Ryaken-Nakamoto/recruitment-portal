import { Amplify } from 'aws-amplify';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';

import awsExports from './aws-exports';
import LoginPage from '@pages/LoginPage';
import AdminHomePage from '@pages/AdminHomePage';
import RecruiterManagementPage from '@pages/RecruiterManagementPage';
import RubricsPage from '@pages/RubricsPage';
import EmailsPage from '@pages/EmailsPage';
import AssignmentPage from '@pages/AssignmentPage';
import ApplicationsPage from '@pages/ApplicationsPage';
import DetailedApplicationPage from '@pages/DetailedApplicationPage';
import RecruiterHomePage from '@pages/RecruiterHomePage';
import RecruiterLandingPage from '@pages/RecruiterLandingPage';
import ProfilePage from '@pages/ProfilePage';
import RecruiterDetailPage from '@pages/RecruiterDetailPage';
import SendEmailPage from '@pages/SendEmailPage';
import SentEmailsPage from '@pages/SentEmailsPage';
import SentEmailDetailPage from '@pages/SentEmailDetailPage';
import AssignmentHistoryPage from '@pages/AssignmentHistoryPage';
import AssignmentHistoryDetailPage from '@pages/AssignmentHistoryDetailPage';
import { AuthedApp } from './components/AuthedApp';
import { Role } from '@api/dtos/enums';
// ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
import { DevUserSwitcher } from './dev/DevUserSwitcher';
// ─────────────────────────────────────────────────────────────────────────────

Amplify.configure(awsExports);

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/recruiter',
    element: <AuthedApp allowedRoles={[Role.RECRUITER]} />,
    children: [
      {
        index: true,
        element: <Navigate to="home" replace />,
      },
      {
        path: 'home',
        element: <RecruiterLandingPage />,
      },
      {
        path: 'applications',
        element: <RecruiterHomePage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'applications/:id',
        element: <DetailedApplicationPage />,
      },
      {
        path: 'completed-assignments/:id',
        element: <AssignmentHistoryDetailPage />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AuthedApp allowedRoles={[Role.ADMIN]} />,
    children: [
      {
        index: true,
        element: <Navigate to="home" replace />,
      },
      {
        path: 'home',
        element: <AdminHomePage />,
      },
      {
        path: 'recruiters',
        element: <RecruiterManagementPage />,
      },
      {
        path: 'recruiters/:id',
        element: <RecruiterDetailPage />,
      },
      {
        path: 'rubrics',
        element: <RubricsPage />,
      },
      {
        path: 'emails',
        element: <EmailsPage />,
      },
      {
        path: 'assignment',
        element: <AssignmentPage />,
      },
      {
        path: 'applications',
        element: <ApplicationsPage />,
      },
      {
        path: 'applications/:id/email',
        element: <SendEmailPage />,
      },
      {
        path: 'applications/:id',
        element: <DetailedApplicationPage />,
      },
      {
        path: 'sent-emails',
        element: <SentEmailsPage />,
      },
      {
        path: 'sent-emails/:id',
        element: <SentEmailDetailPage />,
      },
      {
        path: 'assignment-history',
        element: <AssignmentHistoryPage />,
      },
      {
        path: 'assignment-history/:id',
        element: <AssignmentHistoryDetailPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

export const App: React.FC = () => {
  return (
    <>
      <RouterProvider router={router} />
      {/* ─── DEV ONLY ─ remove before shipping ─────────────────────────────────── */}
      {import.meta.env.VITE_DEV_AUTH_BYPASS === 'true' && <DevUserSwitcher />}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
    </>
  );
};

export default App;
