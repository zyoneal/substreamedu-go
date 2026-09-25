import React, { useContext, useEffect, useState, useRef } from 'react';
import LanguageSelector from './LanguageSelector/LanguageSelector';
import { LanguageContext } from './LanguageContext';
import { AuthContext } from '../store/AuthContext';
import { AuthService } from '../services/AuthService';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { isMobile as isMobileDevice } from 'react-device-detect';
import { FormattedMessage } from 'react-intl';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import MenuIcon from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';

import { RegionService } from '../services/RegionService';
import { SUPPORTED_LANGUAGES } from '../constants/languageConfig';

const Header = () => {
    const { isLoggedIn, setIsLoggedIn, authorities } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const { fluentLanguage, setFluentLanguage } = useContext(LanguageContext);
    const [detectedRegion, setDetectedRegion] = useState<string>('US');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLLIElement>(null);

    const [isMobileScreen, setIsMobileScreen] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth <= 768 || isMobileDevice : isMobileDevice
    );
    const [isMobileNav, setIsMobileNav] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth <= 1140 || isMobileDevice : isMobileDevice
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobileScreen(window.innerWidth <= 768 || isMobileDevice);
            setIsMobileNav(window.innerWidth <= 1140 || isMobileDevice);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    useEffect(() => {
        RegionService.getRegion().then(setDetectedRegion);
    }, []);

    const handleLogout = () => {
        AuthService.logout();
        setIsLoggedIn(false);
        navigate('/login');
    };

    const handleFluentLangSelect = (code: string) => {
        if (!code || code === 'en' || !SUPPORTED_LANGUAGES.some(l => l.code === code)) {
            setFluentLanguage('');
            try {
                localStorage.removeItem('fluentLanguage');
            } catch {}
            return;
        }
        setFluentLanguage(code);
        try {
            localStorage.setItem('fluentLanguage', code);
        } catch {}
    };

    const shouldShowLanguageSelector = () => {
        const path = location.pathname;
        return path === '/videos' ||
            path === '/songs' ||
            path === '/text-paste' ||
            path === '/subtitles' ||
            path.startsWith('/subtitles/') ||
            path === '/youtube-demo' ||
            path === '/movies' ||
            path === '/songs-demo' ||
            path === '/texts-demo' ||
            path === '/subtitles-demo';
    };

    const isHomepage = location.pathname === '/';
    const isDashboard = location.pathname === '/dashboard' || (isHomepage && isLoggedIn);

    return (
        <header className={`${styles.header_container} backdrop-blur-md bg-canvas/80 border-b border-hairline z-50`}>
            <Link to="/" className={styles.logo_container}>
                {isMobileScreen ? (
                    <img src="/logo192.png" alt="S" className={styles.logoImage} />
                ) : (
                    <span className={styles.logoText}>SUBSTREAMEDU</span>
                )}
            </Link>

            {isLoggedIn && !isDashboard && (
                <nav className={styles.navigation}>
                    <ul className="flex items-center gap-1 md:gap-2 m-0 p-0 list-none">
                        {!isMobileNav ? (
                            <>
                                <li>
                                    <Link
                                        to="/videos"
                                        className={`${styles.navItem} ${location.pathname === "/videos" ? styles.active : ""}`}
                                    >
                                        <FormattedMessage id="videoPlayer" defaultMessage="Video Player" />
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/songs"
                                        className={`${styles.navItem} ${location.pathname.startsWith("/songs") ? styles.active : ""}`}
                                    >
                                        <FormattedMessage id="songs" defaultMessage="Songs" />
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/text-paste"
                                        className={`${styles.navItem} ${location.pathname.startsWith("/text-paste") ? styles.active : ""}`}
                                    >
                                        <FormattedMessage id="textPaste" defaultMessage="Text" />
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/subtitles"
                                        className={`${styles.navItem} ${location.pathname.startsWith("/subtitles") ? styles.active : ""}`}
                                    >
                                        <FormattedMessage id="subtitles" defaultMessage="Subtitles" />
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/dictionary"
                                        className={`${styles.navItem} ${location.pathname === "/dictionary" || location.pathname.startsWith("/dictionary/resources/") ? styles.active : ""}`}
                                    >
                                        <FormattedMessage id="dictionary" defaultMessage="Dictionary" />
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/learning"
                                        className={`${styles.navItem} hover:text-white transition-colors duration-200 ${location.pathname.startsWith("/learning") ? "text-primary font-medium" : "text-zinc-400"}`}
                                    >
                                        <FormattedMessage id="learning" defaultMessage="Learning" />
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        to="/telegramBot"

                                        className={`${styles.navItem} ${location.pathname.startsWith("/telegramBot") ? styles.active : ""}`}
                                    >
                                        <FormattedMessage id="telegramChannelMenu" defaultMessage="TelegramBot" />
                                    </Link>
                                </li>
                                {authorities.includes('SYSTEM_ADMIN') && (
                                    <li>
                                        <Link
                                            to="/admin"
                                            className={`${styles.navItem} ${location.pathname === "/admin" ? styles.active : ""}`}
                                        >
                                            <FormattedMessage id="admin" defaultMessage="Admin" />
                                        </Link>
                                    </li>
                                )}
                            </>
                        ) : (
                            <li ref={dropdownRef} className={styles.dropdown}>
                                <button
                                    className={styles.menu}
                                    aria-label="Menu"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setIsMobileMenuOpen(!isMobileMenuOpen);
                                    }}
                                >
                                    {isMobileMenuOpen ? (
                                        <X size={24} strokeWidth={2.5} />
                                    ) : (
                                        <MenuIcon size={24} strokeWidth={2.5} />
                                    )}
                                </button>
                                <div className={`${styles.dropdownContent} ${isMobileMenuOpen ? styles.showMobileMenu : ''}`}>
                                    <Link
                                        to="/videos"
                                        className={`${styles.navItem} ${location.pathname === "/videos" ? styles.active : ""}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <FormattedMessage id="videoPlayer" defaultMessage="Video Player" />
                                    </Link>
                                    <Link
                                        to="/songs"
                                        className={`${styles.navItem} ${location.pathname.startsWith("/songs") ? styles.active : ""}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <FormattedMessage id="songs" defaultMessage="Songs" />
                                    </Link>
                                    <Link
                                        to="/text-paste"
                                        className={`${styles.navItem} ${location.pathname.startsWith("/text-paste") ? styles.active : ""}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <FormattedMessage id="textPaste" defaultMessage="Text" />
                                    </Link>
                                    <Link
                                        to="/subtitles"
                                        className={`${styles.navItem} ${location.pathname.startsWith("/subtitles") ? styles.active : ""}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <FormattedMessage id="subtitles" defaultMessage="Subtitles" />
                                    </Link>
                                    <Link
                                        to="/dictionary"
                                        className={`${styles.navItem} ${location.pathname === "/dictionary" || location.pathname.startsWith("/dictionary/resources/") ? styles.active : ""}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <FormattedMessage id="dictionary" defaultMessage="Dictionary" />
                                    </Link>
                                    <Link
                                        to="/learning"
                                        className={`${styles.navItem} ${location.pathname.startsWith("/learning") ? styles.active : ""}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <FormattedMessage id="learning" defaultMessage="Learning" />
                                    </Link>
                                    <li>
                                        <Link
                                            to="/telegramBot"
                                            className={`${styles.navItem} ${location.pathname.startsWith("/telegramBot") ? styles.active : ""}`}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <FormattedMessage id="telegramChannelMenu" defaultMessage="TelegramBot" />
                                        </Link>
                                    </li>
                                    {authorities.includes('SYSTEM_ADMIN') && (
                                        <Link
                                            to="/admin"
                                            className={`${styles.navItem} ${location.pathname === "/admin" ? styles.active : ""}`}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <FormattedMessage id="admin" defaultMessage="Admin" />
                                        </Link>
                                    )}
                                    {isLoggedIn && (
                                        <button
                                            type="button"
                                            className={styles.logoutLink}
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                handleLogout();
                                            }}
                                        >
                                            <FormattedMessage id="exit" defaultMessage="Exit" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        )}
                    </ul>
                </nav>
            )}

            {shouldShowLanguageSelector() && (
                <div className={`${styles.languageSelectCompact} ${styles.centerLang}`}>
                    <LanguageSelector
                        currentLanguage={fluentLanguage}
                        onLanguageSelect={handleFluentLangSelect}
                        detectedRegion={detectedRegion}
                    />
                </div>
            )}

            {!isLoggedIn && location.pathname !== '/login' && (
                <div className={styles.languageSelectCompact}>
                    <Link to="/login" className={styles.signUpButton}>
                        <FormattedMessage id="signIn" defaultMessage="Login" />
                    </Link>
                </div>
            )}

            {isLoggedIn && (
                <div className={`${styles.user_container} ${location.pathname !== '/dashboard' && location.pathname !== '/' ? styles.desktopOnly : ''}`}>
                    <div
                        aria-label="User Logout Button"
                        tabIndex={0}
                        role="button"
                        className={styles.userProfile}
                        onClick={handleLogout}
                        onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleLogout();
                            }
                        }}
                    >
                        <div className={styles.logoutIconButton}>
                            <LogOut size={18} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;