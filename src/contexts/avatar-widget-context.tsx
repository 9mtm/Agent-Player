'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AvatarWidgetContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const AvatarWidgetContext = createContext<AvatarWidgetContextType>({
  isOpen: false,
  toggle: () => {},
  open: () => {},
  close: () => {},
});

export function AvatarWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AvatarWidgetContext.Provider value={{
      isOpen,
      toggle: () => setIsOpen(v => !v),
      open:   () => setIsOpen(true),
      close:  () => setIsOpen(false),
    }}>
      {children}
    </AvatarWidgetContext.Provider>
  );
}

export function useAvatarWidget() {
  return useContext(AvatarWidgetContext);
}
