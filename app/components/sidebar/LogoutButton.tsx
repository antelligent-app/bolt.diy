import { useCallback } from 'react';
import { IconButton } from '../ui/IconButton';
import { getAccountClient } from '~/lib/appwrite';
import { useNavigate } from "@remix-run/react";

interface LogoutButtonProps {
  className?: string;
}

export const LogoutButton = ({className}: LogoutButtonProps) => {
  const navigate = useNavigate();
  const logout = useCallback(async () => {
    try {
      await getAccountClient().deleteSession('current');
    } catch (error) {
      console.log("error deleting current user session", error);
    }
    navigate('/login');
  }, []) 
  return (
    <IconButton
      className={className}
      icon="i-ph-sign-out"
      size="xl"
      title="Logout"
      onClick={logout}
    />
  )
}
