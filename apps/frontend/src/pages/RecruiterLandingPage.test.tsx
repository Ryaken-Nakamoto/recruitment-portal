import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecruiterLandingPage from './RecruiterLandingPage';

vi.mock('aws-amplify/auth', () => ({ signOut: vi.fn() }));

const renderPage = () => {
  render(
    <MemoryRouter initialEntries={['/recruiter/home']}>
      <Routes>
        <Route path="/recruiter/home" element={<RecruiterLandingPage />} />
        <Route
          path="/recruiter/applications"
          element={<div>Applications Page</div>}
        />
        <Route path="/recruiter/profile" element={<div>Profile Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('RecruiterLandingPage', () => {
  it('renders both cards', () => {
    renderPage();
    expect(screen.getByText('My Applications')).toBeTruthy();
    expect(screen.getByText('Account Info')).toBeTruthy();
  });

  it('navigates to /recruiter/applications when My Applications card is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('My Applications'));
    expect(screen.getByText('Applications Page')).toBeTruthy();
  });

  it('navigates to /recruiter/profile when Account Info card is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Account Info'));
    expect(screen.getByText('Profile Page')).toBeTruthy();
  });
});
