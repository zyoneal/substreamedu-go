import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import X from 'lucide-react/dist/esm/icons/x';
import styles from './modal.module.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    size?: ModalSize;
    className?: string;
    style?: React.CSSProperties;
    closeOnBackdropClick?: boolean;
    closeOnEscape?: boolean;
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

export const Modal: React.FC<ModalProps> & {
    Header: typeof ModalHeader;
    Body: typeof ModalBody;
    Footer: typeof ModalFooter;
} = ({
    isOpen,
    onClose,
    children,
    size = 'md',
    className = '',
    style,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    ariaLabel,
    ariaDescribedBy,
}) => {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape' && closeOnEscape) {
                onClose();
            }
        },
        [closeOnEscape, onClose]
    );

    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen || typeof document === 'undefined') return null;

    const sizeClass = {
        sm: styles.sizeSm,
        md: styles.sizeMd,
        lg: styles.sizeLg,
        xl: styles.sizeXl,
        '2xl': styles.size2xl,
        full: styles.sizeFull,
    }[size];

    return createPortal(
        <div
            className={styles.backdrop}
            onClick={closeOnBackdropClick ? onClose : undefined}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            data-testid="modal-backdrop"
        >
            <div
                className={`${styles.modal} ${sizeClass} ${className}`.trim()}
                style={style}
                onClick={(e) => e.stopPropagation()}
                data-testid="modal-container"
            >
                {children}
            </div>
        </div>,
        document.body
    );
};

export interface ModalHeaderProps {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    icon?: React.ReactNode;
    onClose?: () => void;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
    title,
    subtitle,
    icon,
    onClose,
    className = '',
    style,
    children,
}) => {
    return (
        <div className={`${styles.header} ${className}`.trim()} style={style} data-testid="modal-header">
            {children ? (
                children
            ) : (
                <>
                    <div className={styles.headerLeft}>
                        {icon && <div className={styles.headerIconBadge}>{icon}</div>}
                        <div className={styles.headerTitles}>
                            {title && (
                                <h3 className={styles.title} data-testid="modal-title">
                                    {title}
                                </h3>
                            )}
                            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                        </div>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.closeButton}
                            aria-label="Close modal"
                            data-testid="modal-close-button"
                        >
                            <X size={18} />
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export interface ModalBodyProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className = '', style }) => {
    return (
        <div className={`${styles.body} ${className}`.trim()} style={style}>
            {children}
        </div>
    );
};

export interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '', style }) => {
    return (
        <div className={`${styles.footer} ${className}`.trim()} style={style}>
            {children}
        </div>
    );
};

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: React.ReactNode;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger';
    icon?: React.ReactNode;
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary',
    icon,
    isLoading = false,
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <Modal.Header title={title} icon={icon} onClose={onClose} />
            <Modal.Body>
                <div className={styles.confirmMessage}>{message}</div>
            </Modal.Body>
            <Modal.Footer>
                <button
                    type="button"
                    onClick={onClose}
                    className={styles.btnCancel}
                    disabled={isLoading}
                >
                    {cancelText}
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    className={variant === 'danger' ? styles.btnConfirmDanger : styles.btnConfirmPrimary}
                    disabled={isLoading}
                >
                    {isLoading ? '...' : confirmText}
                </button>
            </Modal.Footer>
        </Modal>
    );
};
