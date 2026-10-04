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
                <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '480px',
                            background: '#1a1917',
                            border: '1px solid #282522',
                            borderRadius: '16px',
                            padding: '32px',
                            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(250, 249, 47, 0.1)',
                            color: '#faf92f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px'
                        }}>
                            <Sparkles size={24} />
                        </div>
                        
                        <h2 style={{ fontSize: '24px', fontWeight: 500, color: '#ede8e0', marginBottom: '12px', fontFamily: '"e-Ukraine", sans-serif' }}>
                            <FormattedMessage id="onboarding.welcome.title" defaultMessage="Welcome to SubStreamEdu" />
                        </h2>
                        
                        <p style={{ fontSize: '15px', color: '#9e988f', lineHeight: 1.6, marginBottom: '24px' }}>
                            <FormattedMessage 
                                id="onboarding.welcome.desc" 
                                defaultMessage="Learn how to use the app in 3 simple steps:" 
                            />
                        </p>

                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <div style={{ background: '#282522', color: '#ede8e0', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Play size={16} />
                                </div>
                                <span style={{ color: '#ede8e0', fontSize: '14px', fontWeight: 500 }}>
                                    <FormattedMessage id="onboarding.welcome.step1" defaultMessage="1. Watch the demo video" />
                                </span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <div style={{ background: '#282522', color: '#ede8e0', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MousePointer2 size={16} />
                                </div>
                                <span style={{ color: '#ede8e0', fontSize: '14px', fontWeight: 500 }}>
                                    <FormattedMessage id="onboarding.welcome.step2" defaultMessage="2. Highlight an unknown word" />
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <div style={{ background: '#282522', color: '#ede8e0', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Bookmark size={16} />
                                </div>
                                <span style={{ color: '#ede8e0', fontSize: '14px', fontWeight: 500 }}>
                                    <FormattedMessage id="onboarding.welcome.step3" defaultMessage="3. Save it to your dictionary" />
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleStart}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#faf92f',
                                color: '#0d0c0b',
                                border: 'none',
                                padding: '14px 28px',
                                borderRadius: '100px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%',
                                justifyContent: 'center'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        >
                            <FormattedMessage id="onboarding.welcome.startInteractive" defaultMessage="Start Interactive Demo" />
                            <ArrowRight size={16} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
