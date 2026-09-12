import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import styles from './RecommendedChannels.module.css';

interface Channel {
    name: string;
    url: string;
    avatarUrl?: string;
    fallbackColor: string;
    fallbackIcon: React.ReactNode;
}

export const RecommendedChannels: React.FC = () => {
    const channels: Channel[] = [
        {
            name: 'Volka English',
            url: 'https://www.youtube.com/@VolkaEnglish',
            avatarUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kX4cWbQxM9E-E3c1iXq_g=s176-c-k-c0x00ffffff-no-rj',
            fallbackColor: '#2563eb',
            fallbackIcon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4L12 20L20 4H15L12 13L9 4H4Z" fill="#ffffff" />
                </svg>
            )
        },
        {
            name: 'MrBeast',
            url: 'https://www.youtube.com/@MrBeast',
            avatarUrl: 'https://yt3.googleusercontent.com/fxGKYucJAVme-YzgnKiYElsYHngxIU-s-aKitYatRGaR=s176-c-k-c0x00ffffff-no-rj',
            fallbackColor: '#0284c7',
            fallbackIcon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5v-9l6 4.5-6 4.5z" fill="#ffffff" />
                </svg>
            )
        },
        {
            name: 'Beast Reacts',
            url: 'https://www.youtube.com/@BeastReacts',
            avatarUrl: 'https://yt3.googleusercontent.com/yU4b_T0T1Wp3d8vA=s176-c-k-c0x00ffffff-no-rj',
            fallbackColor: '#dc2626',
            fallbackIcon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#dc2626" />
                    <path d="M8 9h8M8 15h8M12 9v6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                </svg>
            )
        },
        {
            name: 'Dude Perfect',
            url: 'https://www.youtube.com/@dudeperfect',
            avatarUrl: 'https://yt3.googleusercontent.com/vHq49G5aE=s176-c-k-c0x00ffffff-no-rj',
            fallbackColor: '#0d9488',
            fallbackIcon: (
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.05em' }}>dp</span>
            )
        },
        {
            name: 'Yes Theory',
            url: 'https://www.youtube.com/@YesTheory',
            avatarUrl: 'https://yt3.googleusercontent.com/bA_3t=s176-c-k-c0x00ffffff-no-rj',
            fallbackColor: '#ea580c',
            fallbackIcon: (
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff' }}>YES</span>
            )
        },
        {
            name: 'The Try Guys',
            url: 'https://www.youtube.com/@tryguys',
            avatarUrl: 'https://yt3.googleusercontent.com/tryguys=s176-c-k-c0x00ffffff-no-rj',
            fallbackColor: '#4f46e5',
            fallbackIcon: (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>TG</span>
            )
        },
        {
            name: 'Mark Rober',
            url: 'https://www.youtube.com/@MarkRober',
            avatarUrl: 'https://yt3.googleusercontent.com/markrober=s176-c-k-c0x00ffffff-no-rj',
            fallbackColor: '#27272a',
            fallbackIcon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                </svg>
            )
        },
        {
            name: 'Vogue',
            url: 'https://www.youtube.com/@Vogue',
            avatarUrl: 'https://yt3.googleusercontent.com/vogue=s176-c-k-c0x00ffffff-no-rj',
            fallbackColor: '#141312',
            fallbackIcon: (
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: 'serif', letterSpacing: '0.05em' }}>VOGUE</span>
            )
        },
        {
            name: 'NickDiGiovanni',
            url: 'https://www.youtube.com/@NickDiGiovanni',
            avatarUrl: 'https://yt3.googleusercontent.com/nickdigiovanni=s176-c-k-c0x00ffffff-no-rj',
            fallbackColor: '#e11d48',
            fallbackIcon: (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>ND</span>
            )
        }
    ];

    const ChannelAvatar: React.FC<{ channel: Channel }> = ({ channel }) => {
        const [imgError, setImgError] = useState(false);

        if (!channel.avatarUrl || imgError) {
            return (
                <div
                    className={styles.channelAvatarFallback}
                    style={{ backgroundColor: channel.fallbackColor }}
                >
                    {channel.fallbackIcon}
                </div>
            );
        }

        return (
            <img
                src={channel.avatarUrl}
                alt={channel.name}
                className={styles.channelAvatar}
                onError={() => setImgError(true)}
                loading="lazy"
            />
        );
    };

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
                <FormattedMessage
                    id="videoPage.recommendedChannels"
                    defaultMessage="Recommended Channels"
                />
            </h2>

            <div className={styles.channelList}>
                {channels.map((channel) => (
                    <a
                        key={channel.name}
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.channelLink}
                    >
                        <div className={styles.channelAvatarWrapper}>
                            <ChannelAvatar channel={channel} />
                        </div>
                        <span className={styles.channelName}>
                            {channel.name}
                        </span>
                    </a>
                ))}
            </div>
        </section>
    );
};
