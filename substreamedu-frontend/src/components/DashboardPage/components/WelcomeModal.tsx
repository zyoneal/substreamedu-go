import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormattedMessage } from 'react-intl';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Play from 'lucide-react/dist/esm/icons/play';
import MousePointer2 from 'lucide-react/dist/esm/icons/mouse-pointer-2';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import { useNavigate } from 'react-router-dom';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    const handleStart = () => {
        onClose();
        navigate('/youtube-demo?onboarding=true');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10, 10, 10, 0.45)', backdropFilter: 'blur(12px)' }}
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '480px',
                            background: '#f5f3ef',
                            border: '1px solid rgba(10, 10, 10, 0.12)',
                            borderRadius: '24px',
                            padding: '36px 32px',
                            boxShadow: '0 28px 72px rgba(10, 10, 10, 0.16)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            fontFamily: '"Satoshi", -apple-system, BlinkMacSystemFont, sans-serif'
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: '#eae7e1',
                            border: '1px solid rgba(10, 10, 10, 0.12)',
                            color: '#0a0a0a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px'
                        }}>
                            <Sparkles size={22} />
                        </div>
                        
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0a0a0a', marginBottom: '10px', letterSpacing: '-0.025em', fontFamily: '"Satoshi", sans-serif' }}>
                            <FormattedMessage id="onboarding.welcome.title" defaultMessage="Welcome to SubStreamEdu" />
                        </h2>
                        
                        <p style={{ fontSize: '15px', color: '#4a4a48', lineHeight: 1.6, marginBottom: '24px' }}>
                            <FormattedMessage 
                                id="onboarding.welcome.desc" 
                                defaultMessage="Learn how to use the app in 3 simple steps:" 
                            />
                        </p>

                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', background: '#eae7e1', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(10, 10, 10, 0.1)' }}>
                                <div style={{ background: '#f5f3ef', border: '1px solid rgba(10, 10, 10, 0.12)', color: '#0a0a0a', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Play size={15} />
                                </div>
                                <span style={{ color: '#0a0a0a', fontSize: '14px', fontWeight: 600 }}>
                                    <FormattedMessage id="onboarding.welcome.step1" defaultMessage="1. Watch the demo video" />
                                </span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', background: '#eae7e1', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(10, 10, 10, 0.1)' }}>
                                <div style={{ background: '#f5f3ef', border: '1px solid rgba(10, 10, 10, 0.12)', color: '#0a0a0a', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MousePointer2 size={15} />
                                </div>
                                <span style={{ color: '#0a0a0a', fontSize: '14px', fontWeight: 600 }}>
                                    <FormattedMessage id="onboarding.welcome.step2" defaultMessage="2. Highlight an unknown word" />
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', background: '#eae7e1', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(10, 10, 10, 0.1)' }}>
                                <div style={{ background: '#f5f3ef', border: '1px solid rgba(10, 10, 10, 0.12)', color: '#0a0a0a', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Bookmark size={15} />
                                </div>
                                <span style={{ color: '#0a0a0a', fontSize: '14px', fontWeight: 600 }}>
                                    <FormattedMessage id="onboarding.welcome.step3" defaultMessage="3. Save it to your dictionary" />
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleStart}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: '#0a0a0a',
                                color: '#f5f3ef',
                                border: 'none',
                                padding: '15px 28px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: 700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease',
                                width: '100%',
                                justifyContent: 'center',
                                fontFamily: '"Satoshi", sans-serif'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#262626';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#0a0a0a';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = 'scale(0.98)';
                            }}
                        >
                            <FormattedMessage id="onboarding.welcome.startInteractive" defaultMessage="Start Interactive Demo" />
                            <ArrowRight size={15} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
