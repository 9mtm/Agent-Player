'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'agent_player_dev_mode';

interface DeveloperModeContextType {
    devMode: boolean;
    toggle: () => void;
    setDevMode: (value: boolean) => void;
}

const DeveloperModeContext = createContext<DeveloperModeContextType>({
    devMode: false,
    toggle: () => {},
    setDevMode: () => {},
});

export function DeveloperModeProvider({ children }: { children: ReactNode }) {
    const [devMode, setDevModeState] = useState(false);

    const setDevMode = useCallback((value: boolean) => {
        setDevModeState(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, String(value));
        }
    }, []);

    const toggle = useCallback(() => {
        setDevMode(!devMode);
    }, [devMode, setDevMode]);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'true') setDevModeState(true);
        }
    }, []);

    // Global keyboard shortcut: Ctrl + Shift + D
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setDevModeState(prev => {
                    const newValue = !prev;
                    localStorage.setItem(STORAGE_KEY, String(newValue));
                    return newValue;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <DeveloperModeContext.Provider value={{
            devMode,
            toggle,
            setDevMode,
        }}>
            {children}
        </DeveloperModeContext.Provider>
    );
}

export function useDeveloperMode() {
    return useContext(DeveloperModeContext);
}
