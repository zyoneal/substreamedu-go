import React from 'react';
import { useNavigate } from 'react-router-dom';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import { Modal } from './ui/modal';
import { getGuestTranslationLimit } from '../constants/limits';

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
            icon: <Sparkles size={36} className="text-primary mx-auto" style={{ color: '#faf92f' }} />,
            title: 'You\'re learning fast! 🚀',
            description: 'You\'ve translated 100 phrases. Upgrade to Premium to translate unlimited phrases and master this movie.',
            buttonText: 'Unlock Premium',
            action: () => {
                onClose();
                navigate('/subscribe');
            },
        },
        save: {
            icon: <BookOpen size={36} className="text-primary mx-auto" style={{ color: '#faf92f' }} />,
            title: 'Your vocabulary is growing! 🧠',
            description: 'You\'ve saved 50 words. If you stop now, you might forget them. Premium includes unlimited saves and spaced-repetition to lock them into your long-term memory.',
            buttonText: 'Unlock Premium',
            action: () => {
                onClose();
                navigate('/subscribe');
            },
        },
        guest_limit: {
            icon: <Sparkles size={36} className="text-primary mx-auto" />,
            title: `Guest limit reached (${guestLimit}/${guestLimit})`,
            description: `You’ve used all ${guestLimit} free guest highlights! Create a free account in 10 seconds to unlock 100 translations, save words, and repeat them with our Telegram bot.`,
            buttonText: 'Sign up for free',
            action: () => {
                onClose();
                navigate('/login', { state: { returnUrl: currentReturnUrl } });
            },
        },
        guest_save: {
            icon: <BookOpen size={36} className="text-primary mx-auto" />,
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
            <Modal.Body style={{ padding: '36px 32px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '18px', lineHeight: 1 }}>{msg.icon}</div>
                <h2
                    id="premium-limit-title"
                    style={{
                        color: 'var(--color-ink, #ede8e0)',
                        fontSize: '20px',
                        fontWeight: 500,
                        margin: '0 0 12px 0',
                        fontFamily: "var(--font-display, 'e-Ukraine', sans-serif)",
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                    }}
                >
                    {msg.title}
                </h2>
                <p
                    style={{
                        color: 'var(--color-body, #9e988f)',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        margin: '0 0 28px 0',
                    }}
                >
                    {msg.description}
                </p>

                {(type === 'translation' || type === 'save') && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        textAlign: 'left',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                    }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
                            M
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '13px', color: '#ede8e0', fontStyle: 'italic', lineHeight: 1.5 }}>
                                "Upgrading was the best decision. I learned more in 2 months than in 2 years of classes."
                            </p>
                            <span style={{ fontSize: '11px', color: '#9e988f', marginTop: '6px', display: 'block' }}>— Maria K.</span>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={msg.action}
                        style={{
                            background: 'var(--color-ink, #ede8e0)',
                            color: 'var(--color-canvas, #0d0c0b)',
                            border: '1px solid var(--color-ink, #ede8e0)',
                            padding: '0 28px',
                            height: '46px',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            fontFamily: "var(--font-body, 'e-Ukraine', sans-serif)",
                            letterSpacing: '0.02em',
                            borderRadius: '100px',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease, border-color 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#faf92f';
                            e.currentTarget.style.borderColor = '#faf92f';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ede8e0';
                            e.currentTarget.style.borderColor = '#ede8e0';
                        }}
                    >
                        {msg.buttonText}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            color: 'var(--color-ink, #ede8e0)',
                            border: '1px solid var(--color-hairline, #282522)',
                            padding: '0 28px',
                            height: '46px',
                            fontSize: '13.5px',
                            fontWeight: 400,
                            fontFamily: "var(--font-body, 'e-Ukraine', sans-serif)",
                            letterSpacing: '0.02em',
                            borderRadius: '100px',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s ease, background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-hairline-strong, #3d3934)';
                            e.currentTarget.style.background = 'var(--color-surface-elevated, #1a1917)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-hairline, #282522)';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default PremiumLimitModal;
