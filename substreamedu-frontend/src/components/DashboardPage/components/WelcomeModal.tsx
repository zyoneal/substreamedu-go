import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormattedMessage } from 'react-intl';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
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
                        
                        <p style={{ fontSize: '15px', color: '#9e988f', lineHeight: 1.6, marginBottom: '32px' }}>
                            <FormattedMessage 
                                id="onboarding.welcome.desc" 
                                defaultMessage="You're 60 seconds away from learning English the natural way. Open any video, highlight any word or phrase you don't know, and we'll help you memorize it forever." 
                            />
                        </p>

                        <button
                            onClick={onClose}
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
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        >
                            <FormattedMessage id="onboarding.welcome.start" defaultMessage="Start your first lesson" />
                            <ArrowRight size={16} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
