import { useCallback, useEffect, useState } from 'react';
import { NavigateFunction } from 'react-router-dom';

import { AuthService } from '../services/AuthService';
import { constants } from '../constants/constants';
import { setupInterceptors } from "../services/AxiosService";
import { BackgroundState, ConnectionInfo, BackgroundLoadOptions } from '../types/background';

const useAuth = (navigate: NavigateFunction) => {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
        const saved = localStorage.getItem(constants.isLoggedIn);
        return saved ? JSON.parse(saved) : false;
    });
    const [authorities, setAuthorities] = useState<string[]>(() => {
        return AuthService.getAuthoritiesList() || [];
    });
    const [isLoading] = useState<boolean>(false);

    useEffect(() => {
        const checkLoginStatus = () => {
            const accessUser = AuthService.getUserEmail();
            if (accessUser) {
                setIsLoggedIn(true);
                const roles = AuthService.getAuthoritiesList();
                if (roles) {
                    setAuthorities(roles);
                }
            }
        };
        checkLoginStatus();
    }, []);

    useEffect(() => {
        localStorage.setItem(constants.isLoggedIn, JSON.stringify(isLoggedIn));
        if (!isLoggedIn) {
            setAuthorities([]);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        setupInterceptors(setIsLoggedIn, navigate);
    }, [navigate, setIsLoggedIn]);

    return { isLoggedIn, setIsLoggedIn, isLoading, authorities, setAuthorities };
};

export const useBackgroundImage = (isEnabled: boolean, options: BackgroundLoadOptions = {}) => {


    const loadBackgroundImage = () => {
        return Promise.resolve();
    };

    const applyBackgroundState = (state: BackgroundState) => {
        const classes = ['background-blur', 'background-loaded', 'background-fallback'];

        classes.forEach(cls => document.body.classList.remove(cls));

        if (state === 'remove') {
            document.body.classList.remove('authenticated');
        } else {
            document.body.classList.add('authenticated');
            document.body.classList.add(`background-${state}`);
        }
    };

    const loadOptimized = useCallback(async () => {
        if (!isEnabled) {
            applyBackgroundState('remove');
            return;
        }

        if (options.progressiveLoading !== false) {
            applyBackgroundState('blur');
        }

        try {

            let shouldUseProgressive = false;
            if (options.checkConnection !== false) {
                const connection: ConnectionInfo = (navigator as any).connection;
                shouldUseProgressive = connection &&
                    ((connection.effectiveType === 'slow-2g') ||
                        (connection.effectiveType === '2g') ||
                        Boolean(connection.saveData));
            }

            if (shouldUseProgressive) {

                setTimeout(() => {
                    applyBackgroundState('loaded');
                }, 100);
            } else {

                await loadBackgroundImage();
                applyBackgroundState('loaded');
            }
        } catch (error) {
            console.warn('Background image failed to load:', error);

            applyBackgroundState('fallback');
        }
    }, [isEnabled, options.progressiveLoading, options.checkConnection]);

    return { loadOptimized, applyBackgroundState };
};

export default useAuth;