import React, { useState } from "react";
import { useIntl } from "react-intl";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import styles from "../css/Login.module.css";

interface ILoginProps {
	onLogin: (email: string) => void;
	loginError: string;
	isLoading?: boolean;
}

const Login: React.FC<ILoginProps> = ({ onLogin, loginError, isLoading = false }) => {
	const [email, setEmail] = useState("");
	const [emailError, setEmailError] = useState("");
	const [emailValid, setEmailValid] = useState<boolean | null>(null);

	const intl = useIntl();

	const validateEmail = (email: string): { isValid: boolean; error?: string } => {
		if (!email.trim()) {
			return { isValid: false, error: intl.formatMessage({ id: "emailRequired", defaultMessage: "Enter your email address" }) };
		}

		const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!basicRegex.test(email)) {

			if (!email.includes('@')) {
				return { isValid: false, error: intl.formatMessage({ id: "emailMissingAt", defaultMessage: "Email must contain @" }) };
			}
			if (email.split('@')[0].length === 0) {
				return { isValid: false, error: intl.formatMessage({ id: "emailMissingUsername", defaultMessage: "Enter username before @" }) };
			}
			if (!email.includes('.') || email.split('@')[1].split('.')[0].length === 0) {
				return { isValid: false, error: intl.formatMessage({ id: "emailInvalidDomain", defaultMessage: "Enter valid domain after @" }) };
			}
			if (email.split('.').pop()?.length === 0 || (email.split('.').pop()?.length ?? 0) < 2) {
				return { isValid: false, error: intl.formatMessage({ id: "emailInvalidTld", defaultMessage: "Enter valid domain extension" }) };
			}
			return { isValid: false, error: intl.formatMessage({ id: "emailInvalidFormat", defaultMessage: "Invalid email format" }) };
		}

		const strictRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		if (!strictRegex.test(email)) {
			return { isValid: false, error: intl.formatMessage({ id: "emailInvalidFormat", defaultMessage: "Invalid email format" }) };
		}

		const localPart = email.split('@')[0];
		const domainPart = email.split('@')[1];

		if (localPart.length > 64) {
			return { isValid: false, error: intl.formatMessage({ id: "emailUsernameTooLong", defaultMessage: "Username is too long" }) };
		}

		if (domainPart.length > 255) {
			return { isValid: false, error: intl.formatMessage({ id: "emailDomainTooLong", defaultMessage: "Domain is too long" }) };
		}

		if (email.includes('..')) {
			return { isValid: false, error: intl.formatMessage({ id: "emailInvalidFormat", defaultMessage: "Invalid email format" }) };
		}

		return { isValid: true };
	};

	const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setEmail(value);

		if (value.trim()) {
			const validation = validateEmail(value);
			setEmailValid(validation.isValid);
			if (!validation.isValid) {
				setEmailError(validation.error || "Invalid email");
			} else {
				setEmailError("");
			}
		} else {
			setEmailValid(null);
			setEmailError("");
		}
	};

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();

		const validation = validateEmail(email);
		if (!validation.isValid) {
			setEmailError(validation.error || intl.formatMessage({
				id: "emailInvalid",
				defaultMessage: "Enter a valid email address"
			}));
			return;
		}

		onLogin(email);
	};

	const hasError = (emailError && emailValid === false) || loginError;

	return (
		<div className={styles.loginContainer}>
			<form onSubmit={handleSubmit} className={styles.form} noValidate>
				<div className={styles.inputGroup}>
					<label htmlFor="email" className={styles.label}>
						{intl.formatMessage({
							id: "emailLabel",
							defaultMessage: "Email Address"
						})}
					</label>
					<input
						id="email"
						type="email"
						placeholder={intl.formatMessage({
							id: "emailPlaceholder",
							defaultMessage: "Your email address"
						})}
						value={email}
						onChange={handleEmailChange}
						required
						className={`${styles.input} ${hasError ? styles.inputError :
							emailValid === true ? styles.inputSuccess :
								emailValid === false ? styles.inputError : ''
							}`}
						disabled={isLoading}
						autoComplete="email"
						aria-describedby={hasError ? "email-error" : "email-helper"}
						aria-invalid={hasError ? "true" : "false"}
					/>
					{emailValid === false && emailError && (
						<div className={styles.helperContainer}>
							<div className={styles.validationIcon}>
								<AlertCircle size={14} color="#f87171" />
							</div>
							<p className={`${styles.helperText} ${styles.helperTextError}`}>
								{emailError}
							</p>
						</div>
					)}
				</div>

				<button
					type="submit"
					className={styles.button}
					disabled={isLoading || !email.trim()}
				>
					{isLoading ? (
						<span className={styles.loadingText}>
							<span className={styles.spinner}></span>
							{intl.formatMessage({ id: "sending", defaultMessage: "Sending..." })}
						</span>
					) : (
						intl.formatMessage({ id: "signInButton", defaultMessage: "Get Code" })
					)}
				</button>
			</form>
		</div>
	);
};

export default Login;