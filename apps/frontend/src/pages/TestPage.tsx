// import { Button } from '@shared/src/components/button';

import LogoutButton from '@components/LogoutButton';

const TestPage: React.FC = () => {
  return (
    <>
      <div>I am test page</div>
      <LogoutButton />
      {/* <Button>Clicking this button won't do anything</Button> */}
    </>
  );
};

export default TestPage;
