import { signOut } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';

const LogoutButton: React.FC = () => {
  const navigate = useNavigate();

  const onSignOutClicked = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return <button onClick={onSignOutClicked}>Sign Out</button>;
};

export default LogoutButton;
