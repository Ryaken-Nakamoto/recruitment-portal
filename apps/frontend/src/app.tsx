import { Amplify } from 'aws-amplify';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';

import awsExports from './aws-exports';
import LoginPage from '@pages/LoginPage';
import TestPage from '@pages/TestPage';
import RecruiterManagementPage from '@pages/RecruiterManagementPage';
import RubricsPage from '@pages/RubricsPage';
import EmailsPage from '@pages/EmailsPage';
import AssignmentPage from '@pages/AssignmentPage';
import ApplicationsPage from '@pages/ApplicationsPage';
import RecruiterHomePage from '@pages/RecruiterHomePage';
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
    element: <AuthedApp allowedRoles={[Role.ADMIN, Role.RECRUITER]} />,
    children: [
      {
        index: true,
        element: <Navigate to="home" replace />,
      },
      {
        path: 'home',
        element: <RecruiterHomePage />,
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
        element: <TestPage />,
      },
      {
        path: 'recruiters',
        element: <RecruiterManagementPage />,
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
