import { useCallback } from 'react';
import { IconButton } from '../ui/IconButton';
import { useNavigate } from "@remix-run/react";

interface SettingsKeyButtonProps {
  className?: string;
}

export const SettingsKeyButton = ({className}: SettingsKeyButtonProps) => {
  const navigate = useNavigate();
  const navigateToProviderKeysPage = useCallback(async () => {
    navigate('/settings/provider-keys');
  }, []) 
  return (
    <IconButton
      className={className}
      icon="i-ph-key"
      size="xl"
      title="Set provider keys"
      onClick={navigateToProviderKeysPage}
    />
  )
}
