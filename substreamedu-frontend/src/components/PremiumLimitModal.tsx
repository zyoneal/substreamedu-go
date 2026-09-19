import React from 'react';
import { useNavigate } from 'react-router-dom';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';

interface PremiumLimitModalProps {
    type: 'translation' | 'save' | 'guest_limit' | 'guest_save' | null;
    onClose: () => void;
}

const PremiumLimitModal: React.FC<PremiumLimitModalProps> = ({ type, onClose }) => {
    const navigate = useNavigate();

    if (!type) return null;

    const messages: Record<string, { title: string; description: string; icon: React.ReactNode; buttonText: string; action: () => void }> = {
        translation: {
            icon: <Lock size={36} className="text-primary mx-auto" />,
            title: 'Translation limit reached',
            description: 'You have used all 100 free translations. Get unlimited translations with Premium.',
            buttonText: 'Get Premium',
            action: () => {
                onClose();
                navigate('/subscribe');
            },
        },
        save: {
            icon: <Lock size={36} className="text-primary mx-auto" />,
            title: 'Word save limit reached',
            description: 'You have used all 50 free word saves. Get unlimited saves with Premium.',
            buttonText: 'Get Premium',
            action: () => {
                onClose();
                navigate('/subscribe');
            },
        },
        guest_limit: {
            icon: <Sparkles size={36} className="text-primary mx-auto" />,
            title: 'Guest limit reached (5/5)',
            description: 'You’ve used all 5 free guest highlights! Create a free account in 10 seconds to unlock 100 translations, save words, and repeat them with our Telegram bot.',
            buttonText: 'Sign up for free',
            action: () => {
                onClose();
                navigate('/login');
            },
        },
        guest_save: {
            icon: <BookOpen size={36} className="text-primary mx-auto" />,
            title: 'Sign in to save words',
            description: 'Save any phrase or idiom with context, audio, and spaced-repetition scheduling. Free account includes 50 word saves!',
            buttonText: 'Sign up / Login',
            action: () => {
                onClose();
                navigate('/login');
            },
        },
    };

    const msg = messages[type] || messages.save;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 99999,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#141312',
                    padding: '40px',
                    borderRadius: '16px',
                    width: '380px',
                    textAlign: 'center',
                    border: '1px solid #282522',
                    fontFamily: "'e-Ukraine', system-ui, -apple-system, sans-serif",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ fontSize: '40px', marginBottom: '20px', lineHeight: 1 }}>{msg.icon}</div>
                <h2
                    style={{
                        color: '#ede8e0',
                        fontSize: '20px',
                        fontWeight: 500,
                        margin: '0 0 12px 0',
                        fontFamily: "'e-Ukraine', system-ui, -apple-system, sans-serif",
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                    }}
                >
                    {msg.title}
                </h2>
                <p
                    style={{
                        color: '#9e988f',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        margin: '0 0 32px 0',
                    }}
                >
                    {msg.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={msg.action}
                        style={{
                            background: '#ede8e0',
                            color: '#0d0c0b',
                            border: '1px solid #ede8e0',
                            padding: '0 28px',
                            height: '46px',
                            fontSize: '13.5px',
                            fontWeight: 500,
                            fontFamily: "'e-Ukraine', system-ui, -apple-system, sans-serif",
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
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            color: '#ede8e0',
                            border: '1px solid #282522',
                            padding: '0 28px',
                            height: '46px',
                            fontSize: '13.5px',
                            fontWeight: 400,
                            fontFamily: "'e-Ukraine', system-ui, -apple-system, sans-serif",
                            letterSpacing: '0.02em',
                            borderRadius: '100px',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s ease, background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#3d3934';
                            e.currentTarget.style.background = '#1a1917';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#282522';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PremiumLimitModal;
