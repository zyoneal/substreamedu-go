import React from 'react';

interface StatusNotificationProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const StatusNotification: React.FC<StatusNotificationProps> = ({
  type,
  message,
  onClose,
  autoClose = true,
  duration = 4000
}) => {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, duration]);

  const getNotificationStyles = () => {
    switch (type) {
      case 'success':
        return {
          borderColor: 'rgba(34, 197, 94, 0.25)',
          iconColor: '#22c55e',
          iconPath: 'M5 13l4 4L19 7'
        };
      case 'error':
        return {
          borderColor: 'rgba(239, 68, 68, 0.25)',
          iconColor: '#ef4444',
          iconPath: 'M6 18L18 6M6 6l12 12'
        };
      case 'warning':
        return {
          borderColor: 'rgba(251, 191, 36, 0.25)',
          iconColor: '#fbbf24',
          iconPath: 'M12 9v2m0 4h.01'
        };
      case 'info':
      default:
        return {
          borderColor: 'rgba(10, 10, 10, 0.14)',
          iconColor: '#0a0a0a',
          iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        };
    }
  };

  const styles = getNotificationStyles();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        background: 'var(--color-surface-elevated, #eae7e1)',
        border: `1px solid ${styles.borderColor}`,
        borderRadius: '12px',
        color: 'var(--color-ink, #0a0a0a)',
        fontSize: '14.5px',
        fontWeight: 500,
        boxShadow: '0 8px 24px 0 rgba(10, 10, 10, 0.08)',
        animation: 'notificationFadeIn 0.2s ease-out',
        margin: '8px 0',
        width: '100%',
        boxSizing: 'border-box'
      }}
      role="alert"
      aria-live="polite"
    >
      <svg
        width="18"
        height="18"
        fill="none"
        stroke={styles.iconColor}
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={styles.iconPath}
        />
      </svg>

      <span style={{ flex: 1 }}>{message}</span>

      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8e8e8e',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#0a0a0a';
            e.currentTarget.style.transform = 'rotate(90deg)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#8e8e8e';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
          aria-label="Close notification"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

interface NotificationContainerProps {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  }>;
  onRemove: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove
}) => {
  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '400px'
      }}
    >
      {notifications.map((notification) => (
        <StatusNotification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
};