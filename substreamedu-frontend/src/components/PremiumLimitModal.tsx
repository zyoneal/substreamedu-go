import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen } from 'lucide-react';
import { Modal } from './ui/modal';
import { getGuestTranslationLimit } from '../constants/limits';
import styles from './PremiumLimitModal.module.css';

interface PremiumLimitModalProps {
    type: 'translation' | 'save' | 'guest_limit' | 'guest_save' | null;
    onClose: () => void;
}

const PremiumLimitModal: React.FC<PremiumLimitModalProps> = ({ type, onClose }) => {
    const navigate = useNavigate();

    if (!type) return null;

    const guestLimit = getGuestTranslationLimit();
    const currentReturnUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';

    const messages: Record<string, { title: string; description: string; icon: React.ReactNode; buttonText: string; action: () => void }> = {
        translation: {
            icon: <Sparkles size={28} strokeWidth={1.75} />,
            title: "You're learning fast!",
            description: "You've translated 100 phrases. Upgrade to Premium to translate unlimited phrases and master this movie.",
            buttonText: 'Upgrade to Premium',
            action: () => {
                onClose();
                navigate('/subscribe');
            },
        },
        save: {
            icon: <BookOpen size={28} strokeWidth={1.75} />,
            title: 'Your vocabulary is growing!',
            description: "You've saved 50 words. If you stop now, you might forget them. Premium includes unlimited saves and spaced-repetition to lock them into your long-term memory.",
            buttonText: 'Upgrade to Premium',
            action: () => {
                onClose();
                navigate('/subscribe');
            },
        },
        guest_limit: {
            icon: <Sparkles size={28} strokeWidth={1.75} />,
            title: `Guest limit reached (${guestLimit}/${guestLimit})`,
            description: `You’ve used all ${guestLimit} free guest highlights! Create a free account in 10 seconds to get full access to 100 translations, save words, and repeat them with our Telegram bot.`,
            buttonText: 'Sign up for free',
            action: () => {
                onClose();
                navigate('/login', { state: { returnUrl: currentReturnUrl } });
            },
        },
        guest_save: {
            icon: <BookOpen size={28} strokeWidth={1.75} />,
            title: 'Sign in to save words',
            description: 'Save any phrase or idiom with context, audio, and spaced-repetition scheduling. Free account includes 50 word saves!',
            buttonText: 'Sign up / Login',
            action: () => {
                onClose();
                navigate('/login', { state: { returnUrl: currentReturnUrl } });
            },
        },
    };

    const msg = messages[type] || messages.save;

    return (
        <Modal
            isOpen={!!type}
            onClose={onClose}
            size="sm"
            ariaLabel={msg.title}
        >
            <Modal.Body className={styles.body}>
                <div className={styles.iconWrapper} aria-hidden="true">{msg.icon}</div>
                <h2 id="premium-limit-title" className={styles.title}>
                    {msg.title}
                </h2>
                <p className={styles.description}>
                    {msg.description}
                </p>

                {(type === 'translation' || type === 'save') && (
                    <div className={styles.testimonial}>
                        <div className={styles.avatar} aria-hidden="true">
                            M
                        </div>
                        <div>
                            <p className={styles.quote}>
                                "Upgrading was the best decision. I learned more in 2 months than in 2 years of classes."
                            </p>
                            <span className={styles.author}>— Maria K.</span>
                        </div>
                    </div>
                )}

                <div className={styles.actions}>
                    <button
                        type="button"
                        onClick={msg.action}
                        className={styles.primaryButton}
                    >
                        {msg.buttonText}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.secondaryButton}
                    >
                        Cancel
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default PremiumLimitModal;
