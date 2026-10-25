'use client';

import React, { useEffect } from 'react';
import { usePlayerStore } from '@/lib/store';

export const GoogleConnectModal: React.FC = () => {
  const { isGoogleModalOpen, setGoogleModalOpen, setAccountModalOpen } = usePlayerStore();

  useEffect(() => {
    if (isGoogleModalOpen) {
      setGoogleModalOpen(false);
      setAccountModalOpen(true);
    }
  }, [isGoogleModalOpen, setGoogleModalOpen, setAccountModalOpen]);

  return null;
};
