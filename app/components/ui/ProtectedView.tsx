import { useNavigate, useLocation } from '@remix-run/react';
import { useEffect, type PropsWithChildren } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { getAccountClient } from '~/lib/appwrite';

type ProtectedViewProps = {}

function ProtectedViewBase({ children }: PropsWithChildren<ProtectedViewProps>) {
  const navigate = useNavigate();
  const location = useLocation();
  const checkIfUserIsLoggedIn = async () => {
    try {
      const user = await getAccountClient().get();
      console.log("logged in user: ", user);
    } catch (err) {
      console.log("user not logged in", err);
      navigate(`/login?redirectUri=${location.pathname}`);
    }
  }

  useEffect(() => {
    checkIfUserIsLoggedIn();
  }, [])
  return children
}

export const ProtectedView = ({ children }: PropsWithChildren<ProtectedViewProps>) => {
  return <ClientOnly fallback={null}>{() => (<ProtectedViewBase>{children}</ProtectedViewBase>)}</ClientOnly>
}