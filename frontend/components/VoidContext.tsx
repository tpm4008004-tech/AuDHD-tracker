'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ─── Void Context Shape ───
export interface VoidContextType {
  isVoidActive: boolean;
  voidEndTime: Date | null;
  toggleVoid: () => void;
  deactivateVoid: () => void;
}

const VoidContext = createContext<VoidContextType>({
  isVoidActive: false,
  voidEndTime: null,
  toggleVoid: () => {},
  deactivateVoid: () => {},
});

// ─── Custom hook for consuming the Void state ───
export const useVoid = (): VoidContextType => {
  const context = useContext(VoidContext);
  if (!context) {
    throw new Error('useVoid must be used within a VoidProvider');
  }
  return context;
};

// ─── Provider ───
export const VoidProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isVoidActive, setIsVoidActive] = useState<boolean>(false);
  const [voidEndTime, setVoidEndTime] = useState<Date | null>(null);

  const deactivateVoid = useCallback(() => {
    setIsVoidActive(false);
    setVoidEndTime(null);
  }, []);

  const toggleVoid = useCallback(() => {
    if (isVoidActive) {
      deactivateVoid();
    } else {
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      setIsVoidActive(true);
      setVoidEndTime(endTime);
    }
  }, [isVoidActive, deactivateVoid]);

  // Auto-deactivate when the 2-hour timer expires
  useEffect(() => {
    if (!isVoidActive || !voidEndTime) return;

    const remaining = voidEndTime.getTime() - Date.now();
    if (remaining <= 0) {
      deactivateVoid();
      return;
    }

    const timer = setTimeout(() => {
      deactivateVoid();
    }, remaining);

    return () => clearTimeout(timer);
  }, [isVoidActive, voidEndTime, deactivateVoid]);

  return (
    <VoidContext.Provider value={{ isVoidActive, voidEndTime, toggleVoid, deactivateVoid }}>
      {children}
    </VoidContext.Provider>
  );
};

export default VoidProvider;
