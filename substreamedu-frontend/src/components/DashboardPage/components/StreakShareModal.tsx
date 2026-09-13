import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useIntl, FormattedMessage } from 'react-intl';
import X from 'lucide-react/dist/esm/icons/x';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Download from 'lucide-react/dist/esm/icons/download';
import Check from 'lucide-react/dist/esm/icons/check';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Send from 'lucide-react/dist/esm/icons/send';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import styles from './StreakShareModal.module.css';

export type StreakTheme = 'solar' | 'cosmic' | 'onyx' | 'emerald';

export interface StreakShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    streakDays: number;
    totalWords: number;
    learningWords: number;
    dueToday: number;
    sessionCards?: number;
    reviewedToday?: boolean;
    weekDays?: boolean[];
}

interface ConfettiParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    vRotation: number;
    alpha: number;
}

export const VectorFlameIcon: React.FC<{ theme: StreakTheme; size?: number; className?: string }> = ({
    theme,
    size = 72,
    className
}) => {
    let c1 = '#ef4444', c2 = '#f97316', c3 = '#fbbf24', cCore1 = '#fbbf24', cCore2 = '#ffffff';

    if (theme === 'cosmic') {
        c1 = '#db2777'; c2 = '#a855f7'; c3 = '#38bdf8'; cCore1 = '#c084fc'; cCore2 = '#ffffff';
    } else if (theme === 'onyx') {
        c1 = '#d97706'; c2 = '#f59e0b'; c3 = '#fef08a'; cCore1 = '#fde047'; cCore2 = '#ffffff';
    } else if (theme === 'emerald') {
        c1 = '#059669'; c2 = '#10b981'; c3 = '#38bdf8'; cCore1 = '#6ee7b7'; cCore2 = '#ffffff';
    }

    const gradId = `flame-${theme}-${size}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="-50 -62 100 116"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ filter: `drop-shadow(0 0 16px ${c2}88)` }}
        >
            <defs>
                <linearGradient id={`${gradId}-outer`} x1="0" y1="48" x2="0" y2="-58" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="50%" stopColor={c2} />
                    <stop offset="100%" stopColor={c3} />
                </linearGradient>
                <linearGradient id={`${gradId}-mid`} x1="0" y1="40" x2="0" y2="-28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={c2} />
                    <stop offset="100%" stopColor={c3} />
                </linearGradient>
                <linearGradient id={`${gradId}-core`} x1="0" y1="34" x2="0" y2="-14" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={cCore1} />
                    <stop offset="100%" stopColor={cCore2} />
                </linearGradient>
            </defs>
            <path
                d="M0,48 C24,48 42,32 42,10 C42,-8 30,-22 22,-32 C20,-24 18,-18 12,-22 C22,-36 16,-48 2,-58 C-6,-42 -18,-32 -16,-20 C-22,-24 -26,-28 -28,-24 C-38,-12 -42,8 -42,16 C-42,34 -24,48 0,48 Z"
                fill={`url(#${gradId}-outer)`}
            />
            <path
                d="M0,40 C16,40 28,28 28,12 C28,-2 18,-14 10,-24 C12,-16 4,-14 2,-28 C-2,-18 -12,-12 -12,-4 C-18,-8 -22,-4 -24,4 C-28,16 -18,40 0,40 Z"
                fill={`url(#${gradId}-mid)`}
                opacity="0.9"
            />
            <path
                d="M0,34 C8,34 15,24 15,12 C15,2 4,-6 0,-14 C-4,-6 -15,2 -15,12 C-15,24 -8,34 0,34 Z"
                fill={`url(#${gradId}-core)`}
            />
        </svg>
    );
};

const drawVectorFlame = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    theme: StreakTheme
) => {
    ctx.save();
    ctx.translate(cx, cy);
    const scale = size / 100;
    ctx.scale(scale, scale);

    let c1 = '#ef4444', c2 = '#f97316', c3 = '#fbbf24', cCore1 = '#fbbf24', cCore2 = '#ffffff';

    if (theme === 'cosmic') {
        c1 = '#db2777'; c2 = '#a855f7'; c3 = '#38bdf8'; cCore1 = '#c084fc'; cCore2 = '#ffffff';
    } else if (theme === 'onyx') {
        c1 = '#d97706'; c2 = '#f59e0b'; c3 = '#fef08a'; cCore1 = '#fde047'; cCore2 = '#ffffff';
    } else if (theme === 'emerald') {
        c1 = '#059669'; c2 = '#10b981'; c3 = '#38bdf8'; cCore1 = '#6ee7b7'; cCore2 = '#ffffff';
    }

    // Outer flame path with rich gradient
    const outerGrad = ctx.createLinearGradient(0, 48, 0, -58);
    outerGrad.addColorStop(0, c1);
    outerGrad.addColorStop(0.5, c2);
    outerGrad.addColorStop(1, c3);

    ctx.fillStyle = outerGrad;
    ctx.shadowColor = c2;
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.bezierCurveTo(24, 48, 42, 32, 42, 10);
    ctx.bezierCurveTo(42, -8, 30, -22, 22, -32);
    ctx.bezierCurveTo(20, -24, 18, -18, 12, -22);
    ctx.bezierCurveTo(22, -36, 16, -48, 2, -58);
    ctx.bezierCurveTo(-6, -42, -18, -32, -16, -20);
    ctx.bezierCurveTo(-22, -24, -26, -28, -28, -24);
    ctx.bezierCurveTo(-38, -12, -42, 8, -42, 16);
    ctx.bezierCurveTo(-42, 34, -24, 48, 0, 48);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Mid Flame
    const midGrad = ctx.createLinearGradient(0, 40, 0, -28);
    midGrad.addColorStop(0, c2);
    midGrad.addColorStop(1, c3);
    ctx.fillStyle = midGrad;

    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.bezierCurveTo(16, 40, 28, 28, 28, 12);
    ctx.bezierCurveTo(28, -2, 18, -14, 10, -24);
    ctx.bezierCurveTo(12, -16, 4, -14, 2, -28);
    ctx.bezierCurveTo(-2, -18, -12, -12, -12, -4);
    ctx.bezierCurveTo(-18, -8, -22, -4, -24, 4);
    ctx.bezierCurveTo(-28, 16, -18, 40, 0, 40);
    ctx.closePath();
    ctx.fill();

    // Inner Core Flame (hot white/yellow core)
    const coreGrad = ctx.createLinearGradient(0, 34, 0, -14);
    coreGrad.addColorStop(0, cCore1);
    coreGrad.addColorStop(1, cCore2);
    ctx.fillStyle = coreGrad;

    ctx.beginPath();
    ctx.moveTo(0, 34);
    ctx.bezierCurveTo(8, 34, 15, 24, 15, 12);
    ctx.bezierCurveTo(15, 2, 4, -6, 0, -14);
    ctx.bezierCurveTo(-4, -6, -15, 2, -15, 12);
    ctx.bezierCurveTo(-15, 24, -8, 34, 0, 34);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
};

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const StreakShareModal: React.FC<StreakShareModalProps> = ({
    isOpen,
    onClose,
    streakDays,
    totalWords,
    learningWords,
    dueToday,
    sessionCards,
    reviewedToday = false,
    weekDays
}) => {
    const intl = useIntl();
    const [theme, setTheme] = useState<StreakTheme>('solar');
    const [mousePos, setMousePos] = useState<{ x: number; y: number; isHovered: boolean }>({
        x: 0.5,
        y: 0.5,
        isHovered: false
    });
    const [isCopyingImage, setIsCopyingImage] = useState(false);
    const [copiedImageSuccess, setCopiedImageSuccess] = useState(false);
    const [copiedTextSuccess, setCopiedTextSuccess] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Contextual motivational motto based on streak length
    const getMotto = useCallback((days: number): string => {
        if (days <= 2) return intl.formatMessage({ id: 'streakShare.card.motto.start', defaultMessage: 'The journey begins! One day at a time.' });
        if (days <= 6) return intl.formatMessage({ id: 'streakShare.card.motto.fire', defaultMessage: 'On Fire! Consistency is your superpower.' });
        if (days <= 13) return intl.formatMessage({ id: 'streakShare.card.motto.week', defaultMessage: '1 Week Milestone! Unstoppable habit.' });
        if (days <= 29) return intl.formatMessage({ id: 'streakShare.card.motto.twoWeeks', defaultMessage: '2+ Weeks of Mastery! Building momentum.' });
        return intl.formatMessage({ id: 'streakShare.card.motto.month', defaultMessage: 'Legendary Streak! True language master.' });
    }, [intl]);

    // Calculate 7-day consistency status
    const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const activeStreakCount = Math.min(streakDays, 7);

    // Confetti effect on modal open
    useEffect(() => {
        if (!isOpen) return;

        const canvas = confettiCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#f97316', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#10b981', '#ffffff'];
        const particles: ConfettiParticle[] = [];

        for (let i = 0; i < 70; i++) {
            particles.push({
                x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 200,
                y: window.innerHeight * 0.35 + (Math.random() - 0.5) * 100,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.8) * 16,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * Math.PI * 2,
                vRotation: (Math.random() - 0.5) * 0.2,
                alpha: 1
            });
        }

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let activeCount = 0;

            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35; // gravity
                p.vx *= 0.98; // air drag
                p.rotation += p.vRotation;
                p.alpha -= 0.007;

                if (p.alpha > 0) {
                    activeCount++;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.globalAlpha = Math.max(0, p.alpha);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                    ctx.restore();
                }
            });

            if (activeCount > 0) {
                animFrameRef.current = requestAnimationFrame(render);
            }
        };

        animFrameRef.current = requestAnimationFrame(render);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Card 3D tilt tracking
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setMousePos({ x, y, isHovered: true });
    };

    const handleMouseLeave = () => {
        setMousePos({ x: 0.5, y: 0.5, isHovered: false });
    };

    // --- High-Resolution Canvas Card Generator ---
    const generateStreakCardBlob = useCallback(async (currentTheme: StreakTheme): Promise<Blob> => {
        const width = 1080;
        const height = 1350;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        // 1. Background Theme Setup
        let bgGradient = ctx.createRadialGradient(width / 2, 350, 50, width / 2, height / 2, 700);
        let accentColor = '#f97316';
        let glowColor = 'rgba(249, 115, 22, 0.4)';
        let secondaryColor = '#eab308';

        if (currentTheme === 'solar') {
            bgGradient.addColorStop(0, '#261208');
            bgGradient.addColorStop(0.5, '#130a06');
            bgGradient.addColorStop(1, '#080608');
            accentColor = '#f97316';
            glowColor = 'rgba(249, 115, 22, 0.45)';
            secondaryColor = '#eab308';
        } else if (currentTheme === 'cosmic') {
            bgGradient.addColorStop(0, '#241038');
            bgGradient.addColorStop(0.5, '#120822');
            bgGradient.addColorStop(1, '#07050f');
            accentColor = '#a855f7';
            glowColor = 'rgba(168, 85, 247, 0.45)';
            secondaryColor = '#06b6d4';
        } else if (currentTheme === 'onyx') {
            bgGradient.addColorStop(0, '#1c1c22');
            bgGradient.addColorStop(0.5, '#0e0e12');
            bgGradient.addColorStop(1, '#050507');
            accentColor = '#eab308';
            glowColor = 'rgba(234, 179, 8, 0.3)';
            secondaryColor = '#ffffff';
        } else if (currentTheme === 'emerald') {
            bgGradient.addColorStop(0, '#0c281e');
            bgGradient.addColorStop(0.5, '#071610');
            bgGradient.addColorStop(1, '#040907');
            accentColor = '#10b981';
            glowColor = 'rgba(16, 185, 129, 0.45)';
            secondaryColor = '#06b6d4';
        }

        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // 2. Outer Ambient Glow
        const ambientGlow = ctx.createRadialGradient(width / 2, 420, 0, width / 2, 420, 480);
        ambientGlow.addColorStop(0, glowColor);
        ambientGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = ambientGlow;
        ctx.fillRect(0, 0, width, height);

        // 3. Double-Bezel Card Container
        const cardMargin = 60;
        const cardWidth = width - cardMargin * 2;
        const cardHeight = height - cardMargin * 2;
        const cardX = cardMargin;
        const cardY = cardMargin;
        const cardRadius = 52;

        // Card border / container
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
        } else {
            ctx.rect(cardX, cardY, cardWidth, cardHeight);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // 4. Header Bar
        ctx.save();
        // Brand Pill
        const brandPillX = cardX + 50;
        const brandPillY = cardY + 50;
        const brandPillW = 260;
        const brandPillH = 54;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(brandPillX, brandPillY, brandPillW, brandPillH, 27);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Logo indicator dot
        ctx.fillStyle = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(brandPillX + 28, brandPillY + 27, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Brand text
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Nunito", "Inter", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('SUBSTREAMEDU', brandPillX + 48, brandPillY + 27);

        // Right Milestone Badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('STREAK MILESTONE', cardX + cardWidth - 50, brandPillY + 27);
        ctx.restore();

        // 5. Center Hero Flame Circle & Graphic
        const flameCenterX = width / 2;
        const flameCenterY = cardY + 290;

        // Radiant halo ring (soft ambient glow)
        ctx.save();
        const haloGrad = ctx.createRadialGradient(flameCenterX, flameCenterY, 20, flameCenterX, flameCenterY, 150);
        haloGrad.addColorStop(0, glowColor);
        haloGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
        haloGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(flameCenterX, flameCenterY, 150, 0, Math.PI * 2);
        ctx.fill();

        // Glass sphere wrapper
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(flameCenterX, flameCenterY, 82, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Vector Flame with rich multi-layer gradient
        drawVectorFlame(ctx, flameCenterX, flameCenterY + 4, 110, currentTheme);
        ctx.restore();

        // 6. Streak Number & Label
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Huge Number
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 20;
        ctx.font = '900 156px -apple-system, BlinkMacSystemFont, "Nunito", "Inter", sans-serif';
        ctx.fillText(`${streakDays}`, flameCenterX, flameCenterY + 110);

        // Day Streak Label
        ctx.fillStyle = '#f1f5f9';
        ctx.shadowBlur = 0;
        ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.fillText('DAY STREAK', flameCenterX, flameCenterY + 280);

        // Motto pill
        const mottoText = getMotto(streakDays);
        ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        const mottoWidth = ctx.measureText(mottoText).width + 60;
        const mottoX = flameCenterX - mottoWidth / 2;
        const mottoY = flameCenterY + 340;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(mottoX, mottoY, mottoWidth, 54, 27);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.textBaseline = 'middle';
        ctx.fillText(mottoText, flameCenterX, mottoY + 27);
        ctx.restore();

        // 7. 7-Day Consistency Week Ring
        const ringBoxX = cardX + 50;
        const ringBoxY = cardY + 740;
        const ringBoxW = cardWidth - 100;
        const ringBoxH = 130;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(ringBoxX, ringBoxY, ringBoxW, ringBoxH, 24);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const step = ringBoxW / 7;
        DAYS_OF_WEEK.forEach((dayLabel, idx) => {
            const nodeCenterX = ringBoxX + step * idx + step / 2;
            const nodeCenterY = ringBoxY + 70;
            const isActive = weekDays && weekDays.length === 7
                ? weekDays[idx]
                : (reviewedToday
                    ? idx <= currentDayIndex && (currentDayIndex - idx < activeStreakCount)
                    : idx < currentDayIndex && (currentDayIndex - 1 - idx < activeStreakCount));
            const isToday = idx === currentDayIndex;

            // Day label (top)
            ctx.fillStyle = isActive ? '#ffffff' : '#71717a';
            ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dayLabel, nodeCenterX, ringBoxY + 26);

            // Circle node
            ctx.beginPath();
            ctx.arc(nodeCenterX, nodeCenterY + 12, 24, 0, Math.PI * 2);
            if (isActive) {
                const dayGrad = ctx.createLinearGradient(nodeCenterX - 20, nodeCenterY - 20, nodeCenterX + 20, nodeCenterY + 20);
                dayGrad.addColorStop(0, accentColor);
                dayGrad.addColorStop(1, secondaryColor);
                ctx.fillStyle = dayGrad;
                ctx.shadowColor = accentColor;
                ctx.shadowBlur = 14;
                ctx.fill();
                ctx.shadowBlur = 0;

                if (isToday) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }

                // Inner check or flame
                ctx.fillStyle = '#ffffff';
                ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
                ctx.fillText('✓', nodeCenterX, nodeCenterY + 13);
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });
        ctx.restore();

        // 8. Stats Chips (3 Columns)
        const statsBoxY = cardY + 900;
        const statsChipW = (cardWidth - 100 - 32) / 3;
        const statsChipH = 120;

        const isAllCaughtUp = reviewedToday && dueToday === 0;
        const dailyCount = sessionCards !== undefined && sessionCards > 0 ? sessionCards : dueToday;

        let statCardsLabel = 'CARDS TODAY';
        let statCardsValue = `${dailyCount}`;
        let statCardsIcon = '📝';

        if (isAllCaughtUp) {
            statCardsLabel = 'DAILY GOAL';
            statCardsValue = 'DONE';
            statCardsIcon = '✅';
        }

        const statsData = [
            { label: 'WORDS', value: `${totalWords}`, icon: '📚' },
            { label: 'LEARNING', value: `${learningWords}`, icon: '📈' },
            { label: statCardsLabel, value: statCardsValue, icon: statCardsIcon }
        ];

        statsData.forEach((stat, i) => {
            const chipX = cardX + 50 + i * (statsChipW + 16);
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(chipX, statsBoxY, statsChipW, statsChipH, 20);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.fillStyle = '#a1a1aa';
            ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(stat.label, chipX + statsChipW / 2, statsBoxY + 45);

            ctx.fillStyle = '#ffffff';
            ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(`${stat.icon} ${stat.value}`, chipX + statsChipW / 2, statsBoxY + 92);
            ctx.restore();
        });

        // 9. Card Footer / Watermark
        ctx.save();
        const footerY = cardY + cardHeight - 60;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 50, footerY - 24);
        ctx.lineTo(cardX + cardWidth - 50, footerY - 24);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Master English with Movies & Songs', cardX + 50, footerY);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('substreamedu.com', cardX + cardWidth - 50, footerY);
        ctx.restore();

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas export failed'));
            }, 'image/png');
        });
    }, [streakDays, totalWords, learningWords, dueToday, sessionCards, reviewedToday, currentDayIndex, activeStreakCount, getMotto, weekDays]);

    // Share text message
    const shareText = `🔥 I'm on a ${streakDays}-day learning streak on SubstreamEdu! 🚀 ${totalWords} words mastered. Keep the flame alive!`;
    const shareUrl = 'https://substreamedu.com';

    // Copy Image Action
    const handleCopyImage = async () => {
        setIsCopyingImage(true);
        try {
            const blob = await generateStreakCardBlob(theme);
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                setCopiedImageSuccess(true);
                setToastMessage(intl.formatMessage({ id: 'streakShare.btn.copiedImage', defaultMessage: 'Copied to Clipboard!' }));
                setTimeout(() => {
                    setCopiedImageSuccess(false);
                    setToastMessage(null);
                }, 3000);
            } else {
                // Fallback: download and copy text
                handleDownloadImage();
                navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                setToastMessage('Image downloaded & link copied!');
                setTimeout(() => setToastMessage(null), 3000);
            }
        } catch (err) {
            console.error('Failed to copy image to clipboard:', err);
            // Fallback download
            handleDownloadImage();
            setToastMessage('Image downloaded!');
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setIsCopyingImage(false);
        }
    };

    // Download Image Action
    const handleDownloadImage = async () => {
        try {
            const blob = await generateStreakCardBlob(theme);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `substreamedu-streak-${streakDays}-days.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setToastMessage(intl.formatMessage({ id: 'streakShare.toast.downloaded', defaultMessage: 'Story image downloaded!' }));
            setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
            console.error('Failed to download image:', err);
        }
    };

    // Native Share Action
    const handleNativeShare = async () => {
        try {
            const blob = await generateStreakCardBlob(theme);
            const file = new File([blob], `substreamedu-streak-${streakDays}-days.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `SubstreamEdu ${streakDays}-Day Streak!`,
                    text: shareText,
                    url: shareUrl
                });
            } else if (navigator.share) {
                await navigator.share({
                    title: `SubstreamEdu ${streakDays}-Day Streak!`,
                    text: shareText,
                    url: shareUrl
                });
            } else {
                handleCopyText();
            }
        } catch (err) {
            // If user dismissed or failed, ignore or copy text
            if ((err as any).name !== 'AbortError') {
                handleCopyText();
            }
        }
    };

    // Copy formatted text & link
    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
            setCopiedTextSuccess(true);
            setToastMessage(intl.formatMessage({ id: 'streakShare.btn.copiedText', defaultMessage: 'Link Copied!' }));
            setTimeout(() => {
                setCopiedTextSuccess(false);
                setToastMessage(null);
            }, 3000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    if (!isOpen) return null;

    // 3D Card transform calculations
    const rotateX = mousePos.isHovered ? (mousePos.y - 0.5) * -16 : 0;
    const rotateY = mousePos.isHovered ? (mousePos.x - 0.5) * 16 : 0;
    const glareBackground = mousePos.isHovered
        ? `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(255,255,255,0.2) 0%, transparent 60%)`
        : 'none';

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
            <canvas ref={confettiCanvasRef} className={styles.confettiCanvas} />

            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.headerLeft}>
                        <div className={styles.headerIconBadge}>
                            <VectorFlameIcon theme={theme} size={24} />
                        </div>
                        <div className={styles.headerTitles}>
                            <h2 className={styles.modalTitle}>
                                <FormattedMessage id="streakShare.modal.title" defaultMessage="Streak Milestone" />
                                <Sparkles size={16} style={{ color: '#eab308' }} />
                            </h2>
                            <p className={styles.modalSubtitle}>
                                <FormattedMessage id="streakShare.modal.subtitle" defaultMessage="Celebrate your consistency & share with friends!" />
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={styles.closeButton}
                        aria-label={intl.formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.previewSection}>
                        <div
                            className={styles.trophyCardWrapper}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{
                                transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1, 1, 1)`
                            }}
                        >
                            <div
                                className={`${styles.trophyCard} ${
                                    theme === 'solar'
                                        ? styles.themeSolar
                                        : theme === 'cosmic'
                                        ? styles.themeCosmic
                                        : theme === 'onyx'
                                        ? styles.themeOnyx
                                        : styles.themeEmerald
                                }`}
                            >
                                <div className={styles.cardGlare} style={{ background: glareBackground }} />
                                <div className={styles.cardHeader}>
                                    <div className={styles.brandPill}>
                                        <div className={styles.brandLogoDot} />
                                        <span>SUBSTREAMEDU</span>
                                    </div>
                                    <span className={styles.milestonePill}>STREAK MILESTONE</span>
                                </div>
                                <div className={styles.heroFlameContainer}>
                                    <div className={styles.flameHalo} />
                                    <div className={styles.flameIconWrapper}>
                                        <VectorFlameIcon theme={theme} size={74} />
                                    </div>

                                    <div className={styles.streakDisplay}>
                                        <span className={styles.streakBigNumber}>{streakDays}</span>
                                        <span className={styles.streakBigLabel}>
                                            <FormattedMessage id="streakShare.card.dayStreak" defaultMessage="DAY STREAK" />
                                        </span>
                                    </div>

                                    <div className={styles.mottoBadge}>
                                        {getMotto(streakDays)}
                                    </div>
                                </div>
                                <div className={styles.weekRingContainer}>
                                    {DAYS_OF_WEEK.map((day, idx) => {
                                        const isActive = weekDays && weekDays.length === 7
                                            ? weekDays[idx]
                                            : (reviewedToday
                                                ? idx <= currentDayIndex && (currentDayIndex - idx < activeStreakCount)
                                                : idx < currentDayIndex && (currentDayIndex - 1 - idx < activeStreakCount));
                                        const isToday = idx === currentDayIndex;
                                        return (
                                            <div key={idx} className={styles.dayNode}>
                                                <span className={`${styles.dayLabel} ${isActive ? styles.dayLabelActive : ''}`}>
                                                    {day}
                                                </span>
                                                <div
                                                    className={`${styles.dayCircle} ${
                                                        isActive ? styles.dayCircleActive : ''
                                                    } ${isToday ? styles.dayCircleToday : ''}`}
                                                >
                                                    {isActive ? <Check size={12} strokeWidth={3} className="text-canvas" /> : ''}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className={styles.statsRow}>
                                    <div className={styles.statChip}>
                                        <span className={styles.statChipValue}>
                                            <BookOpen size={14} className="inline mr-1" /> {totalWords}
                                        </span>
                                        <span className={styles.statChipLabel}>
                                            <FormattedMessage id="streakShare.card.wordsLearned" defaultMessage="Words" />
                                        </span>
                                    </div>
                                    <div className={styles.statChip}>
                                        <span className={styles.statChipValue}>
                                            <TrendingUp size={14} className="inline mr-1" /> {learningWords}
                                        </span>
                                        <span className={styles.statChipLabel}>
                                            <FormattedMessage id="streakShare.card.learning" defaultMessage="Learning" />
                                        </span>
                                    </div>
                                    <div className={styles.statChip}>
                                        <span className={styles.statChipValue}>
                                            {reviewedToday && dueToday === 0 ? (
                                                <><Check size={14} className="inline mr-1 text-terminal-green" /> Done</>
                                            ) : (
                                                <><FileText size={14} className="inline mr-1" /> {sessionCards !== undefined && sessionCards > 0 ? sessionCards : dueToday}</>
                                            )}
                                        </span>
                                        <span className={styles.statChipLabel}>
                                            {reviewedToday && dueToday === 0 ? (
                                                <FormattedMessage id="dashboard.stats.dailyGoal" defaultMessage="Daily Goal" />
                                            ) : (
                                                <FormattedMessage id="dashboard.stats.cardsToday" defaultMessage="Cards Today" />
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.cardFooter}>
                                    <span className={styles.footerTagline}>Master English with Context</span>
                                    <span className={styles.footerDomain}>substreamedu.com</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.controlsSection}>
                        <div className={styles.sectionBlock}>
                            <label className={styles.sectionLabel}>
                                <FormattedMessage id="streakShare.section.cardTheme" defaultMessage="Card Theme" />
                            </label>
                            <div className={styles.themeGrid}>
                                <button
                                    type="button"
                                    onClick={() => setTheme('solar')}
                                    className={`${styles.themeOptionBtn} ${theme === 'solar' ? styles.themeOptionBtnActive : ''}`}
                                >
                                    <div className={`${styles.themeSwatch} ${styles.swatchSolar}`} />
                                    <span>
                                        <FormattedMessage id="streakShare.theme.solar" defaultMessage="Solar Flare" />
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTheme('cosmic')}
                                    className={`${styles.themeOptionBtn} ${theme === 'cosmic' ? styles.themeOptionBtnActive : ''}`}
                                >
                                    <div className={`${styles.themeSwatch} ${styles.swatchCosmic}`} />
                                    <span>
                                        <FormattedMessage id="streakShare.theme.cosmic" defaultMessage="Cosmic Violet" />
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTheme('onyx')}
                                    className={`${styles.themeOptionBtn} ${theme === 'onyx' ? styles.themeOptionBtnActive : ''}`}
                                >
                                    <div className={`${styles.themeSwatch} ${styles.swatchOnyx}`} />
                                    <span>
                                        <FormattedMessage id="streakShare.theme.onyx" defaultMessage="Midnight Onyx" />
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTheme('emerald')}
                                    className={`${styles.themeOptionBtn} ${theme === 'emerald' ? styles.themeOptionBtnActive : ''}`}
                                >
                                    <div className={`${styles.themeSwatch} ${styles.swatchEmerald}`} />
                                    <span>
                                        <FormattedMessage id="streakShare.theme.emerald" defaultMessage="Emerald Glow" />
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div className={styles.actionButtonsGroup}>
                            <button
                                type="button"
                                onClick={handleCopyImage}
                                disabled={isCopyingImage}
                                className={`${styles.btnPrimary} ${copiedImageSuccess ? styles.btnPrimarySuccess : ''}`}
                            >
                                {copiedImageSuccess ? (
                                    <>
                                        <Check size={18} strokeWidth={3} />
                                        <span>
                                            <FormattedMessage id="streakShare.btn.copiedImage" defaultMessage="Copied to Clipboard!" />
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={18} strokeWidth={2.2} />
                                        <span>
                                            {isCopyingImage ? 'Generating...' : (
                                                <FormattedMessage id="streakShare.btn.copyImage" defaultMessage="Copy Image" />
                                            )}
                                        </span>
                                    </>
                                )}
                            </button>
                            <div className={styles.secondaryButtonsGrid}>
                                <button
                                    type="button"
                                    onClick={handleDownloadImage}
                                    className={styles.btnSecondary}
                                >
                                    <Download size={16} strokeWidth={2.2} />
                                    <span>
                                        <FormattedMessage id="streakShare.btn.download" defaultMessage="Download Story" />
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleNativeShare}
                                    className={styles.btnSecondary}
                                >
                                    <Share2 size={16} strokeWidth={2.2} />
                                    <span>
                                        <FormattedMessage id="streakShare.btn.shareNative" defaultMessage="Share" />
                                    </span>
                                </button>
                            </div>
                            <div className={styles.sectionBlock} style={{ marginTop: '8px' }}>
                                <label className={styles.sectionLabel}>
                                    <FormattedMessage id="streakShare.section.quickShare" defaultMessage="Quick Share" />
                                </label>
                                <div className={styles.socialRow}>
                                    <a
                                        href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${styles.socialBtn} ${styles.socialBtnTelegram}`}
                                        title="Share to Telegram"
                                    >
                                        <Send size={15} />
                                        <span>Telegram</span>
                                    </a>

                                    <a
                                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${styles.socialBtn} ${styles.socialBtnTwitter}`}
                                        title="Share to X"
                                    >
                                        <span>𝕏 Post</span>
                                    </a>

                                    <button
                                        type="button"
                                        onClick={handleCopyText}
                                        className={styles.socialBtn}
                                        title="Copy Link"
                                    >
                                        {copiedTextSuccess ? <Check size={14} style={{ color: '#22c55e' }} /> : <ExternalLink size={14} />}
                                        <span>{copiedTextSuccess ? 'Copied!' : 'Copy Link'}</span>
                                    </button>
                                </div>
                            </div>

                            {toastMessage && (
                                <div className={styles.toastNotice}>
                                    <Check size={14} />
                                    <span>{toastMessage}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
export default StreakShareModal;
