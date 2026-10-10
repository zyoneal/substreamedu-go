import React, { useContext, useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";

import { axiosService } from "../../services/AxiosService";
import { urls } from "../../constants/urls";
import { debugLog, debugError } from "../../utils/debug";
import X from "lucide-react/dist/esm/icons/x";
import Edit2 from "lucide-react/dist/esm/icons/edit-2";
import { ReactComponent as GoogleIcon } from "../../icons/google.svg";
import { AuthService } from "../../services/AuthService";
import { AnalyticsService } from "../../services/AnalyticsService";
import { GuestLimitService } from "../../services/GuestLimitService";
import { AuthContext } from "../../store/AuthContext";
import Login from "./Login/Login";
import { useIntl } from "react-intl";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./css/LoginPage.module.css";
import { constants } from "../../constants/constants";

const getPostLoginDestination = (locationState?: any): string => {
    const pendingWord = GuestLimitService.getPendingSaveWord();
    if (pendingWord) {
        if (pendingWord.videoUrl) {
            sessionStorage.setItem('videoUrl', pendingWord.videoUrl);
        }
        if (pendingWord.timecode !== undefined) {
            sessionStorage.setItem('videoCurrentTime', pendingWord.timecode.toString());
        }
        if (pendingWord.returnUrl) {
            return pendingWord.returnUrl;
        }
        if (pendingWord.videoUrl) {
            return "/videos";
        }
    }
    if (locationState?.returnUrl) {
        return locationState.returnUrl;
    }
    return "/";
};

const CustomGoogleButton: React.FC = () => {
    const [loginError, setLoginError] = useState<string>("");
    const navigate = useNavigate();
    const location = useLocation();
    const { setIsLoggedIn } = useContext(AuthContext);
    const intl = useIntl();
    const googleButtonRef = useRef<HTMLDivElement>(null);

    const handleGoogleLoginSuccess = async (response: CredentialResponse) => {
        if (!response.credential) {
            debugError("No credential received");
            setLoginError("Google login failed. No credential received.");
            return;
        }

        try {
            debugLog("Google Response:", response);

            const backendResponse = await axiosService.post(
                urls.auth.google,
                { token: response.credential }
            );

            debugLog("Backend Response:", backendResponse.data);

            const { userId, token, email, role, isNewUser, createdAt } = backendResponse.data;

            localStorage.setItem("jwt", token);
            if (email) {
                localStorage.setItem(constants.userId, userId);
                localStorage.setItem(constants.userEmail, email);
            }
            if (role) {
                AuthService.setAuthoritiesList([role]);
            }

            AnalyticsService.identify(userId, { email, role, createdAt });
            const wasRegistered = localStorage.getItem(`substreamedu_registered_${userId}`) === 'true';
            if (isNewUser || !wasRegistered) {
                AnalyticsService.trackSignup('google', email);
                localStorage.setItem(`substreamedu_registered_${userId}`, 'true');
                if (createdAt) {
                    localStorage.setItem(`substreamedu_signup_date_${userId}`, createdAt);
                }
            } else {
                AnalyticsService.checkAndTrackReturnD2(userId, createdAt);
            }

            setIsLoggedIn(true);
            const destination = getPostLoginDestination(location.state);
            navigate(destination, { replace: true });
        } catch (error) {
            debugError("Google login failed:", error);
            setLoginError("Google login failed. Please try again.");
        }
    };

    const handleCustomButtonClick = () => {
        const googleButton = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement;
        if (googleButton) {
            googleButton.click();
        }
    };

    return (
        <div className={styles.googleSignIn}>
            <div ref={googleButtonRef} className={styles.hiddenGoogleButton}>
                <GoogleLogin
                    onSuccess={handleGoogleLoginSuccess}
                    onError={() => setLoginError("Google login failed")}
                    theme="outline"
                    size="large"
                    text="signin_with"
                />
            </div>

            <motion.button
                className={styles.customGoogleButton}
                onClick={handleCustomButtonClick}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                aria-label={intl.formatMessage({
                    id: "continueWithGoogle",
                    defaultMessage: "Continue with Google"
                })}
            >
                <GoogleIcon className={styles.googleIcon} />
                <span className={styles.googleButtonText}>
                    {intl.formatMessage({
                        id: "continueWithGoogle",
                        defaultMessage: "Continue with Google"
                    })}
                </span>
            </motion.button>

            {loginError && <div className={styles.error}>{loginError}</div>}
        </div>
    );
};

const ProgressIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep }) => {
    return (
        <div className={styles.progressContainer}>
            <span className={`${styles.progressStepItem} ${currentStep >= 1 ? styles.progressStepItemActive : ''}`}>
                01 // Email
            </span>
            <span className={styles.progressDivider}>→</span>
            <span className={`${styles.progressStepItem} ${currentStep >= 2 ? styles.progressStepItemActive : ''}`}>
                02 // Verify code
            </span>
        </div>
    );
};

const LoginPage: React.FC = () => {
    const [loginError, setLoginError] = useState<string>("");
    const [otp, setOtp] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [otpSent, setOtpSent] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [otpLoading, setOtpLoading] = useState<boolean>(false);

    const verifyButtonRef = useRef<HTMLButtonElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { setIsLoggedIn } = useContext(AuthContext);
    const intl = useIntl();

    useEffect(() => {
        const savedEmail = localStorage.getItem('emailForOtp');
        const waitingForOtp = localStorage.getItem('waitingForOtp');

        if (savedEmail && waitingForOtp === 'true') {
            setEmail(savedEmail);
            setOtpSent(true);
        }
    }, []);

    const handleLogin = async (email: string) => {
        setLoginError("");
        setEmail(email);
        setIsLoading(true);

        try {
            const loginResult = await AuthService.login(email);
            debugLog("Login result:", loginResult);

            // Success - proceed to OTP verification
            localStorage.setItem('emailForOtp', email);
            localStorage.setItem('waitingForOtp', 'true');
            setOtpSent(true);
        } catch (error: any) {
            debugError("Login error:", error);
            const errorMessage = error?.message || intl.formatMessage({
                id: "incorrectLogin",
                defaultMessage: "Failed to send code. Please check your email."
            });
            setLoginError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp.trim()) {
            setLoginError(intl.formatMessage({
                id: "codeRequired",
                defaultMessage: "Enter verification code"
            }));
            return;
        }

        setOtpLoading(true);
        setLoginError("");

        try {
            const verifyResult = await AuthService.verify(email, otp);
            if (verifyResult) {
                const userId = AuthService.getUserId() || '';
                AnalyticsService.identify(userId, { email });
                const wasRegistered = localStorage.getItem(`substreamedu_registered_${userId}`) === 'true';
                if (!wasRegistered) {
                    AnalyticsService.trackSignup('otp', email);
                    localStorage.setItem(`substreamedu_registered_${userId}`, 'true');
                    localStorage.setItem(`substreamedu_signup_date_${userId}`, new Date().toISOString());
                } else {
                    AnalyticsService.checkAndTrackReturnD2(userId);
                }

                const button = verifyButtonRef.current;
                if (button) {
                    button.classList.add(styles.verifyButtonSuccess);
                    setTimeout(() => {
                        localStorage.removeItem('emailForOtp');
                        localStorage.removeItem('waitingForOtp');
                        setIsLoggedIn(true);
                        const destination = getPostLoginDestination(location.state);
                        navigate(destination, { replace: true });
                    }, 800);
                }
            } else {
                setLoginError(intl.formatMessage({
                    id: "invalidOtp",
                    defaultMessage: "Invalid code. Please check and try again."
                }));

                const input = document.querySelector('input[type="text"]') as HTMLElement;
                if (input) {
                    input.classList.add(styles.inputShake);
                    setTimeout(() => input.classList.remove(styles.inputShake), 500);
                }
            }
        } catch (error) {
            debugError("OTP verification error:", error);
            setLoginError(intl.formatMessage({
                id: "otpVerificationFailed",
                defaultMessage: "Verification failed. Please try again."
            }));
        } finally {
            setOtpLoading(false);
        }
    };

    const handleBackToEmail = () => {
        localStorage.removeItem('emailForOtp');
        localStorage.removeItem('waitingForOtp');
        setOtpSent(false);
        setOtp("");
        setLoginError("");
    };

    const handleResendCode = async () => {
        await handleLogin(email);
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        navigate("/", { replace: true });
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                navigate("/", { replace: true });
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);

    return (
        <motion.div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
        >
            <motion.div
                className={styles.modal}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className={styles.header}>
                    <button
                        type="button"
                        onClick={handleClose}
                        className={styles.closeButton}
                        aria-label="Close login"
                    >
                        <X size={15} />
                    </button>
                </div>
                <div className={styles.content}>
                    {!otpSent && (
                        <div className={styles.brandHeader}>
                            <span className={styles.brandEyebrow}>Authentication</span>
                            <h2 id="login-title" className={styles.brandTitle}>SubStreamEdu</h2>
                            <p className={styles.brandSubtitle}>
                                {intl.formatMessage({
                                    id: "loginWelcome",
                                    defaultMessage: "Welcome back! Enter your email to begin learning."
                                })}
                            </p>
                        </div>
                    )}

                    {otpSent && <ProgressIndicator currentStep={2} totalSteps={2} />}

                    <div className={`${styles.stepContainer} ${otpSent ? styles.stepContainerOtp : styles.stepContainerEmail}`}>
                        <AnimatePresence mode="wait">
                            {!otpSent ? (
                                <motion.div
                                    key="email-step"
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 12 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="w-full flex flex-col items-center"
                                >
                                    <Login
                                        onLogin={handleLogin}
                                        loginError={loginError}
                                        isLoading={isLoading}
                                    />

                                    <div className={styles.divider}>
                                        <span className={styles.dividerText}>
                                            {intl.formatMessage({
                                                id: "orContinueWithGoogle",
                                                defaultMessage: "or"
                                            })}
                                        </span>
                                    </div>

                                    <CustomGoogleButton />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="otp-step"
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="w-full"
                                >
                                    <div className={styles.otpSection}>
                                        <div className={styles.otpHeader}>
                                            <h2 id="login-title" className={styles.otpTitle}>
                                                {intl.formatMessage({
                                                    id: "enterEmailCode",
                                                    defaultMessage: "Enter verification code"
                                                })}
                                            </h2>
                                            <p id="otp-helper" className={styles.otpHelper}>
                                                {intl.formatMessage({
                                                    id: "enterEmailCodeHelper",
                                                    defaultMessage: "We sent a code to your email. Check your spam folder if you don't see it."
                                                })}
                                            </p>
                                            <div className={styles.emailDisplayContainer}>
                                                <span className={styles.emailDisplay}>{email}</span>
                                                <button
                                                    type="button"
                                                    onClick={handleBackToEmail}
                                                    className={styles.changeEmailButton}
                                                    aria-label="Change email"
                                                    title="Change email"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.otpInputGroup}>
                                            <input
                                                type="text"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                                                className={`${styles.otpInput} ${otp.length > 0 ? styles.otpInputFilled : ''}`}
                                                placeholder={intl.formatMessage({
                                                    id: "otpPlaceholder",
                                                    defaultMessage: "Code"
                                                })}
                                                maxLength={6}
                                                autoComplete="one-time-code"
                                                aria-label="Confirmation code"
                                                aria-describedby="otp-helper"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                            />

                                            <motion.button
                                                ref={verifyButtonRef}
                                                onClick={handleVerifyOtp}
                                                className={`${styles.verifyButton} ${otpLoading ? styles.verifyButtonLoading : ''} ${otp.length === 6 ? styles.verifyButtonReady : ''}`}
                                                disabled={otpLoading || otp.length < 6}
                                                whileHover={otp.length === 6 && !otpLoading ? { scale: 1.01 } : {}}
                                                whileTap={otp.length === 6 && !otpLoading ? { scale: 0.99 } : {}}
                                            >
                                                {otpLoading ? (
                                                    <div className={styles.loadingSpinner}>
                                                        <div className={styles.spinner}></div>
                                                        <span>{intl.formatMessage({ id: "verifying", defaultMessage: "Verifying..." })}</span>
                                                    </div>
                                                ) : (
                                                    intl.formatMessage({ id: "verifyCode", defaultMessage: "Verify" })
                                                )}
                                            </motion.button>
                                        </div>

                                        <div className={styles.otpActions}>
                                            <button
                                                onClick={handleResendCode}
                                                className={styles.resendButton}
                                                disabled={isLoading}
                                                aria-label={intl.formatMessage({ id: "resendCode", defaultMessage: "Resend code" })}
                                            >
                                                {intl.formatMessage({ id: "resendCode", defaultMessage: "Resend code" })}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {loginError && (
                        <div className={styles.error} role="alert" aria-live="polite">
                            {loginError}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div >
    );
};

export default LoginPage;