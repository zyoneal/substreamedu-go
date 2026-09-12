import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useIntl, FormattedMessage } from 'react-intl';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  Check,
  ArrowRight,
  Plus,
  Film,
  Play,
  X,
  Music,
  Sparkles,
  Headphones,
  MousePointer,
  Eye,
  Cpu,
  BookmarkCheck,
  GraduationCap,
  CreditCard,
  Laptop,
  Send,
  Sliders,
  Volume2,
} from 'lucide-react';
import { SEO } from '../SEO/SEO';
import ScrollingTextWall from './ScrollingTextWall';
import styles from './HomePage.module.css';

interface HeroWordItem {
  text: string;
  isAccent?: boolean;
}

const HERO_TITLE_WORDS: HeroWordItem[] = [
  { text: 'Learn', isAccent: false },
  { text: 'native', isAccent: false },
  { text: 'English', isAccent: true },
  { text: 'naturally', isAccent: false },
  { text: 'through', isAccent: false },
  { text: 'movies,', isAccent: true },
  { text: 'music,', isAccent: true },
  { text: 'and', isAccent: false },
  { text: 'texts', isAccent: true },
];

const heroTitleContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.075,
      delayChildren: 0.1,
    },
  },
};

const heroWordVariants = {
  hidden: {
    opacity: 0,
    y: 18,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
  artifact: React.ReactNode;
}

const FEATURES: FeatureItem[] = [
  {
    icon: <Headphones size={20} strokeWidth={1.75} />,
    title: 'Hear first, read second.',
    desc: 'Subtitles blur by default. Hover to reveal. Optional 2\u2011second delay gives your ears a head start.',
    artifact: (
      <div className={styles.miniBlurArtifact} data-cursor="reveal" data-cursor-text="Hover to reveal">
        <div className={styles.miniBlurText}>
          <span className={styles.miniBlurTarget} title="Hover to reveal">
            I had a hunch about that.
          </span>
        </div>
        <div className={styles.miniArtifactBadge}>
          <Sliders size={10} strokeWidth={1.75} />
          <span>2s delay ready</span>
        </div>
      </div>
    ),
  },
  {
    icon: <MousePointer size={20} strokeWidth={1.75} />,
    title: 'Select like you copy text.',
    desc: 'Drag across idioms, phrasal verbs, or whole clauses to translate in context.',
    artifact: (
      <div className={styles.miniSelectionArtifact} data-cursor="drag" data-cursor-text="Drag phrase">
        <div className={styles.miniSelectionText}>
          let&apos;s <span className={styles.miniSelectionHighlight}>call it a day<span className={styles.miniSelectionCursor} /></span>
        </div>
        <div className={styles.miniArtifactBadge}>
          <MousePointer size={10} strokeWidth={1.75} />
          <span>idiom translated</span>
        </div>
      </div>
    ),
  },
  {
    icon: <BookmarkCheck size={20} strokeWidth={1.75} />,
    title: 'Every word keeps its story.',
    desc: 'Save words or phrases with audio, phonetics, and the exact scene.',
    artifact: (
      <div className={styles.miniDictArtifact} data-cursor="action" data-cursor-text="Scene Dictionary">
        <div className={styles.miniDictHeader}>
          <span className={styles.miniDictWord}>hunch</span>
          <span className={styles.miniDictPhonetic}>/hʌntʃ/</span>
        </div>
        <div className={styles.miniDictMeta}>
          <span className={styles.miniDictTag}><Volume2 size={10} strokeWidth={1.75} /> 0:02</span>
          <span className={styles.miniDictTag}><Film size={10} strokeWidth={1.75} /> S01E03 · 14:20</span>
        </div>
      </div>
    ),
  },
  {
    icon: <Cpu size={20} strokeWidth={1.75} />,
    title: 'Science does the scheduling.',
    desc: 'FSRS spaces reviews at the exact interval your memory needs.',
    artifact: (
      <div className={styles.miniSrsArtifact} data-cursor="action" data-cursor-text="FSRS Spaced Repetition">
        <div className={styles.miniSrsTrack}>
          <span className={styles.miniSrsPill}>1d</span>
          <span className={styles.miniSrsArrow}>→</span>
          <span className={styles.miniSrsPill}>3d</span>
          <span className={styles.miniSrsArrow}>→</span>
          <span className={styles.miniSrsPill}>8d</span>
          <span className={styles.miniSrsArrow}>→</span>
          <span className={styles.miniSrsPillActive}>21d</span>
        </div>
        <div className={styles.miniSrsStat}>
          <span className={styles.miniSrsDot} />
          <span>FSRS 94% retention</span>
        </div>
      </div>
    ),
  },
  {
    icon: <Send size={20} strokeWidth={1.75} />,
    title: 'Morning reviews, zero effort.',
    desc: 'Flashcards and quizzes delivered to Telegram before your first coffee.',
    artifact: (
      <div className={styles.miniTgArtifact} data-cursor="action" data-cursor-text="Telegram Delivery">
        <div className={styles.miniTgHeader}>
          <span className={styles.miniTgApp}><Send size={10} strokeWidth={1.75} /> Telegram</span>
          <span className={styles.miniTgTime}>9:00 AM</span>
        </div>
        <div className={styles.miniTgMsg}>50 flashcards ready for morning review</div>
      </div>
    ),
  },
  {
    icon: <Film size={20} strokeWidth={1.75} />,
    title: 'Movies \u00B7 Songs \u00B7 Texts \u00B7 AI',
    desc: 'YouTube, your own files, synced lyrics, or AI-generated stories by level.',
    artifact: (
      <div className={styles.miniFormatsArtifact} data-cursor="action" data-cursor-text="4 Media Formats">
        <span className={styles.miniFormatPill}>YouTube</span>
        <span className={styles.miniFormatPill}>Synced Lyrics</span>
        <span className={styles.miniFormatPill}>Transcripts</span>
        <span className={styles.miniFormatPill}>AI Stories</span>
      </div>
    ),
  },
];

const HomePage: React.FC = () => {
  const intl = useIntl();

  const demoVideoRef = useRef<HTMLVideoElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isSubtitleRevealed, setIsSubtitleRevealed] = useState(false);
  const [isDemoWordAdded, setIsDemoWordAdded] = useState(false);

  // Global scroll progress micro-bar
  const { scrollYProgress } = useScroll();
  const scrollProgressSpring = useSpring(scrollYProgress, {
    stiffness: 320,
    damping: 32,
    mass: 0.2,
  });

  // Hero multi-plane camera parallax
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const wallY = useTransform(heroScrollProgress, [0, 1], [0, 96]);
  const wallScale = useTransform(heroScrollProgress, [0, 1], [1, 0.93]);
  const wallOpacity = useTransform(heroScrollProgress, [0, 0.8, 1], [1, 0.65, 0.2]);

  const heroContentY = useTransform(heroScrollProgress, [0, 1], [0, 48]);
  const heroContentOpacity = useTransform(heroScrollProgress, [0, 0.75, 1], [1, 0.85, 0.2]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (pageRef.current) {
        pageRef.current.style.setProperty('--spotlight-x', `${e.clientX}px`);
        pageRef.current.style.setProperty('--spotlight-y', `${e.clientY}px`);
      }
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // ─────────────────────────────────────────────
  // FAQ
  // ─────────────────────────────────────────────
  const faqItems = [
    {
      q: intl.formatMessage({ id: 'homePage.faq.q1', defaultMessage: 'What content can I learn with in SubStreamEdu?' }),
      a: (
        <ul className={styles.faqListWrapper}>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>1</span>
            <div>
              <span className={styles.faqItemTitle}>YouTube:</span>
              paste any video, podcast, interview, or lecture link.
            </div>
          </li>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>2</span>
            <div>
              <span className={styles.faqItemTitle}>Movies &amp; Series:</span>
              your own files (<span className={styles.faqCodeBadge}>.mp4</span>, <span className={styles.faqCodeBadge}>.mkv</span>, <span className={styles.faqCodeBadge}>.srt</span>) from torrents or via our Telegram bot{' '}
              <a href="https://t.me/cinemagic_hd_bot" target="_blank" rel="noopener noreferrer">@cinemagic_hd_bot</a>.
            </div>
          </li>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>3</span>
            <div>
              <span className={styles.faqItemTitle}>Music &amp; Songs:</span>
              learn English with synchronized lyrics. Highlight words and phrases to translate.
            </div>
          </li>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>4</span>
            <div>
              <span className={styles.faqItemTitle}>Custom &amp; AI Texts:</span>
              type or paste any text you wrote, or generate interactive stories tailored to your exact CEFR level (A1, A2, B1, B2, C1) and any chosen topic (e.g. Travel, Job Interview, Tech).
            </div>
          </li>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>5</span>
            <div>
              <span className={styles.faqItemTitle}>Subtitles as Text:</span>
              read full movie transcripts as interactive text. Highlight words and phrases with your cursor just like copying text.
            </div>
          </li>
        </ul>
      ),
    },
    {
      q: intl.formatMessage({ id: 'homePage.faq.q2', defaultMessage: 'How to upload video?' }),
      a: (
        <ul className={styles.faqListWrapper}>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>1</span>
            <div>
              Upload any video file (<span className={styles.faqCodeBadge}>.mp4</span> or <span className={styles.faqCodeBadge}>.mkv</span>) with the movie title in the filename, or paste a YouTube link.
            </div>
          </li>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>2</span>
            <div>
              Choose matching subtitles from the suggested list, or upload your own <span className={styles.faqCodeBadge}>.srt</span> file.
            </div>
          </li>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>3</span>
            <div>
              Watch and highlight unfamiliar words or whole phrases with your cursor (just like copying text).
            </div>
          </li>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>4</span>
            <div>
              Save words directly into your smart SRS dictionary with translation, context, and audio.
            </div>
          </li>
        </ul>
      ),
    },
    {
      q: intl.formatMessage({ id: 'homePage.faq.q3', defaultMessage: 'Is it free?' }),
      a: intl.formatMessage({ id: 'homePage.faq.a3', defaultMessage: 'Yes. Up to 100 translations and 50 saved words. If the service really boosts your English, get a subscription and learn without limits.' }),
    },
    {
      q: intl.formatMessage({ id: 'homePage.faq.q4', defaultMessage: 'What is Active Listening Mode and default subtitle blur?' }),
      a: (
        <>
          {intl.formatMessage({ id: 'homePage.faq.a4', defaultMessage: 'By default, subtitles are blurred so your brain is forced to understand native speech by ear instead of passively reading ahead. Whenever you want to verify what you heard or look up words, simply hover your cursor over the subtitle (or tap on mobile) to unblur it instantly. In player settings, you can also enable a 2-second subtitle delay (-2s).' })}
          {' '}<a href="https://www.youtube.com/watch?v=uH1aDCjypKg" target="_blank" rel="noopener noreferrer">YouTube demo</a>
        </>
      ),
    },
    {
      q: intl.formatMessage({ id: 'homePage.faq.q5', defaultMessage: 'What makes the Smart Dictionary special?' }),
      a: (
        <>
          {intl.formatMessage({ id: 'homePage.faq.a5', defaultMessage: 'Unlike generic translators, SubStreamEdu analyzes the full sentence context to translate idioms and slang accurately. Every word is saved with audio, phonetics, and context sentence, scheduled via the scientific FSRS algorithm.' })}
          {' '}<a href="https://youglish.com/" target="_blank" rel="noopener noreferrer">Youglish</a>
        </>
      ),
    },
    {
      q: intl.formatMessage({ id: 'homePage.faq.q6', defaultMessage: 'Repetition via Telegram bot' }),
      a: intl.formatMessage({ id: 'homePage.faq.a6', defaultMessage: 'Your dictionary is integrated with the bot. Every morning the bot sends you words to repeat using spaced repetition. Plus quizzes, statistics, and gamification.' }),
    },
  ];

  const [openIndexes, setOpenIndexes] = useState<boolean[]>(Array(faqItems.length).fill(false));
  useEffect(() => {
    setOpenIndexes(Array(faqItems.length).fill(false));
  }, [faqItems.length]);

  const handleToggle = useCallback((idx: number) => {
    setOpenIndexes((prev) => prev.map((open, i) => (i === idx ? !open : open)));
  }, []);

  // ─────────────────────────────────────────────
  // Structured data
  // ─────────────────────────────────────────────
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SubStreamEdu',
    url: 'https://substreamedu.com',
    logo: 'https://substreamedu.com/logo512.png',
    sameAs: ['https://twitter.com/substreamedu', 'https://youtube.com/substreamedu', 'https://t.me/substreamedu'],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@substreamedu.com',
      contactType: 'customer service',
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What content can I learn with in SubStreamEdu?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'YouTube: paste any video, podcast, interview, or lecture link. Movies & Series: your own files (.mp4, .mkv, .srt). Music & Songs: learn English with synchronized lyrics. Custom & AI Texts: type or paste text, or generate interactive stories tailored to your CEFR level (A1-C1) and topic. Subtitles as Text: read full movie transcripts as interactive text.',
        },
      },
      {
        '@type': 'Question',
        name: 'How to upload video?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Upload any video file (.mp4 or .mkv) with the movie title in the filename, or paste a YouTube link. Choose matching subtitles from the suggested list, or upload your own .srt file. Watch and highlight unfamiliar words or whole phrases with your cursor. Save words directly into your smart SRS dictionary with translation, context, and audio.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is it free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Up to 100 translations and 50 saved words. If the service really boosts your English, get a subscription and learn without limits.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is Active Listening Mode and default subtitle blur?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'By default, subtitles are blurred so your brain is forced to understand native speech by ear instead of passively reading ahead. Whenever you want to verify what you heard or look up words, simply hover your cursor over the subtitle (or tap on mobile) to unblur it instantly. In player settings, you can also enable a 2-second subtitle delay (-2s).',
        },
      },
      {
        '@type': 'Question',
        name: 'What makes the Smart Dictionary special?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Unlike generic translators, SubStreamEdu analyzes the full sentence context to translate idioms and slang accurately. Every word is saved with audio, phonetics, and context sentence, scheduled via the scientific FSRS algorithm.',
        },
      },
      {
        '@type': 'Question',
        name: 'Repetition via Telegram bot',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your dictionary is integrated with the bot. Every morning the bot sends you words to repeat using spaced repetition. Plus quizzes, statistics, and gamification.',
        },
      },
    ],
  };

  // ─────────────────────────────────────────────
  // Demo Modal
  // ─────────────────────────────────────────────
  const handleOpenModal = () => {
    setIsDemoModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDemoModalOpen(false);
    if (demoVideoRef.current) {
      demoVideoRef.current.pause();
    }
  };

  useEffect(() => {
    if (isDemoModalOpen) {
      document.body.style.overflow = 'hidden';
      if (demoVideoRef.current) {
        demoVideoRef.current.play().catch(() => {});
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDemoModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDemoModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDemoModalOpen]);

  // Framer Motion helpers
  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' as const },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className={styles.page} ref={pageRef}>
      <div className={styles.projectorBeam} aria-hidden="true" />
      <div className={styles.interactiveSpotlight} aria-hidden="true" />
      <div className={styles.filmVignette} aria-hidden="true" />
      <div className={styles.filmGrain} aria-hidden="true" />
      <motion.div className={styles.scrollProgressBar} style={{ scaleX: scrollProgressSpring }} aria-hidden="true" />

      <SEO
        title="SubStreamEdu | Learn English with Movies, Music & Interactive Texts"
        description="Learn English through movies, synchronized song lyrics, subtitle transcripts, and custom or AI texts. Highlight any word or phrase with your cursor to save directly to your dictionary."
        canonicalUrl="https://substreamedu.com/"
        jsonLd={organizationJsonLd}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroLayout}>
          <motion.div
            className={styles.heroContent}
            style={{ y: heroContentY, opacity: heroContentOpacity }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.h1
              className={styles.heroTitle}
              variants={heroTitleContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {HERO_TITLE_WORDS.map((item, index) => (
                <motion.span
                  key={index}
                  variants={heroWordVariants}
                  className={`${styles.heroWord} ${item.isAccent ? styles.heroTitleSerif : ''}`}
                >
                  {item.text}
                </motion.span>
              ))}
            </motion.h1>

            <p className={styles.heroSub}>
              Blurred subtitles, contextual phrase translation, and scientific spaced repetition from the content you already love.
            </p>

            <div className={styles.heroActions}>
              <Link to="/login" className={styles.btnPrimary}>
                Start free
                <ArrowRight size={14} className={styles.btnIcon} />
              </Link>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleOpenModal}
                data-cursor="action"
                data-cursor-text="Video Walkthrough"
              >
                <Play size={12} className={styles.btnPlayIcon} />
                Watch demo
              </button>
            </div>

            <div className={styles.heroTrustBadge}>
              <span className={styles.heroTrustBadgeItem}>
                <Check size={12} strokeWidth={2.5} className={styles.heroTrustBadgeIcon} />
                Free tier included
              </span>
              <span className={styles.heroTrustDot}>&bull;</span>
              <span className={styles.heroTrustBadgeItem}>
                <CreditCard size={12} strokeWidth={1.75} className={styles.heroTrustBadgeIcon} />
                No card required
              </span>
              <span className={styles.heroTrustDot}>&bull;</span>
              <span className={styles.heroTrustBadgeItem}>
                <Laptop size={12} strokeWidth={1.75} className={styles.heroTrustBadgeIcon} />
                Desktop &amp; mobile
              </span>
            </div>

            <div className={styles.heroQuickDock}>
              <span className={styles.heroQuickDockLabel}>Try without signup:</span>
              <div className={styles.heroQuickDockLinks}>
                <Link to="/youtube-demo" className={styles.heroQuickDockItem}>
                  <Film size={12} strokeWidth={1.75} />
                  <span>Movie Player</span>
                </Link>
                <span className={styles.heroQuickDockDivider} />
                <Link to="/songs-demo" className={styles.heroQuickDockItem}>
                  <Music size={12} strokeWidth={1.75} />
                  <span>Synced Lyrics</span>
                </Link>
                <span className={styles.heroQuickDockDivider} />
                <Link to="/texts-demo" className={styles.heroQuickDockItem}>
                  <Sparkles size={12} strokeWidth={1.75} />
                  <span>AI Stories</span>
                </Link>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={styles.heroWallContainer}
            style={{ y: wallY, scale: wallScale, opacity: wallOpacity }}
            data-cursor="stream"
            data-cursor-text="Cinema Stream"
          >
            <ScrollingTextWall />
          </motion.div>
        </div>
      </section>

      <section className={styles.featureSection}>
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            {FEATURES.map((item, idx) => (
              <motion.div
                key={idx}
                className={styles.featureCard}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className={styles.featureCardIcon}>{item.icon}</span>
                <h3 className={styles.featureCardTitle}>{item.title}</h3>
                <p className={styles.featureCardDesc}>{item.desc}</p>
                <div className={styles.featureCardArtifact}>
                  {item.artifact}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.demoSection}>
        <div className={styles.container}>
          <div className={styles.demoLayout}>
            <motion.div className={styles.demoText} {...fadeUp}>
              <span className={styles.sectionEyebrow}>How it works</span>
              <h2 className={styles.sectionTitle}>
                Drag to select. Translate in context. Save to dictionary.
              </h2>
            </motion.div>

            <motion.div className={styles.subtitleDemo} {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
              <div className={styles.demoHeaderRow}>
                <span className={styles.subtitleDemoLabel}>Active listening demo</span>
                <span className={styles.demoCursorBadge}>
                  <MousePointer size={11} strokeWidth={1.75} />
                  <span>Drag &amp; Highlight</span>
                </span>
              </div>

              <div className={styles.blurHintPill}>
                <Eye size={10} strokeWidth={1.75} />
                <span>{isSubtitleRevealed ? 'Click to blur' : 'Hover or click line to unblur'}</span>
              </div>
              <div
                className={`${styles.subtitleLineBlurred} ${isSubtitleRevealed ? styles.subtitleLineUnblurredActive : ''}`}
                onClick={() => setIsSubtitleRevealed((prev) => !prev)}
                title="Click or hover cursor to unblur and reveal"
                data-cursor="reveal"
                data-cursor-text={isSubtitleRevealed ? "Click to blur" : "Hover to reveal"}
              >
                We should probably take it for granted at this point.
              </div>

              <div className={styles.subtitleLineRevealed}>
                Hey relax, it&apos;s{' '}
                <span
                  className={styles.selectedPhrase}
                  data-cursor="drag"
                  data-cursor-text="Drag phrase"
                >
                  no problem<span className={styles.selectionCursor} />
                </span>
                , I&apos;ll take care of it.
              </div>

              <div className={styles.translationPopup}>
                <div className={styles.translationHeader}>
                  <span className={styles.translationWord}>no problem</span>
                  <span className={styles.translationType}>
                    <FormattedMessage id="homePage.demo.phraseType" defaultMessage="full phrase / idiom" />
                  </span>
                </div>
                <span className={styles.translationMeaning}>
                  <FormattedMessage id="homePage.demo.phraseMeaning" defaultMessage="no problem / you're welcome" />
                </span>
                <button
                  className={`${styles.addToDictBtn} ${isDemoWordAdded ? styles.addToDictBtnSaved : ''}`}
                  type="button"
                  onClick={() => setIsDemoWordAdded((prev) => !prev)}
                >
                  {isDemoWordAdded ? (
                    <>
                      <Check size={12} strokeWidth={2.5} />
                      <span>Saved to Dictionary</span>
                    </>
                  ) : (
                    <>
                      <Plus size={12} />
                      <FormattedMessage id="homePage.demo.addToDict" defaultMessage="Add to Dictionary" />
                    </>
                  )}
                </button>
              </div>

              <div className={styles.demoComparison}>
                <div className={styles.demoComparisonItem}>
                  <span className={styles.demoCompNegative}>
                    <X size={12} strokeWidth={2.5} className={styles.demoCompNegativeIcon} />
                    <span>
                      <FormattedMessage
                        id="homePage.demo.compNegative"
                        defaultMessage='Single-word click: "problem" (loses idiom meaning)'
                      />
                    </span>
                  </span>
                </div>
                <div className={styles.demoComparisonItem}>
                  <span className={styles.demoCompPositive}>
                    <Check size={12} strokeWidth={2.5} className={styles.demoCompPositiveIcon} />
                    <span>
                      <FormattedMessage
                        id="homePage.demo.compPositive"
                        defaultMessage='Cursor selection: "no problem" → "{meaning}"'
                        values={{
                          meaning: intl.formatMessage({
                            id: 'homePage.demo.phraseMeaning',
                            defaultMessage: "no problem / you're welcome",
                          }),
                        }}
                      />
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.container}>
          <motion.div className={styles.pricingSectionHeader} {...fadeUp}>
            <span className={styles.sectionEyebrow}>Pricing</span>
            <h2 className={styles.sectionTitle}>
              Simple, transparent pricing.
            </h2>
          </motion.div>

          <div className={styles.pricingGrid}>
            <motion.div
              className={styles.pricingCard}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: 0, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.pricingHeader}>
                <h3 className={styles.pricingTier}>
                  <FormattedMessage id="homePage.pricing.free.title" defaultMessage="Free" />
                </h3>
                <div className={styles.pricingAmount}>
                  <span className={styles.pricingPriceNum}>$0</span>
                </div>
              </div>
              <ul className={styles.pricingList}>
                <li className={styles.pricingListItem}>
                  <Check size={13} className={styles.pricingCheck} />
                  <FormattedMessage id="homePage.pricing.free.feature1" defaultMessage="Up to 100 translations" />
                </li>
                <li className={styles.pricingListItem}>
                  <Check size={13} className={styles.pricingCheck} />
                  <FormattedMessage id="homePage.pricing.free.feature2" defaultMessage="Up to 50 saves to dictionary" />
                </li>
                <li className={styles.pricingListItem}>
                  <Check size={13} className={styles.pricingCheck} />
                  <FormattedMessage id="homePage.pricing.premium.feature3" defaultMessage="Contextual AI translation" />
                </li>
              </ul>
            </motion.div>

            <motion.div
              className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className={styles.pricingBadge}>
                <FormattedMessage id="homePage.pricing.recommended" defaultMessage="Most Popular" />
              </span>
              <div className={styles.pricingHeader}>
                <h3 className={styles.pricingTier}>
                  <FormattedMessage id="homePage.pricing.premium.title" defaultMessage="Premium" />
                </h3>
                <div className={styles.pricingAmount}>
                  <span className={styles.pricingPriceNum}>$10</span>
                  <span className={styles.pricingPeriod}>/mo</span>
                </div>
              </div>
              <ul className={styles.pricingList}>
                <li className={styles.pricingListItem}>
                  <Check size={13} className={styles.pricingCheck} />
                  <FormattedMessage id="homePage.pricing.premium.feature1" defaultMessage="Unlimited translations" />
                </li>
                <li className={styles.pricingListItem}>
                  <Check size={13} className={styles.pricingCheck} />
                  <FormattedMessage id="homePage.pricing.premium.feature2" defaultMessage="Unlimited saves to dictionary" />
                </li>
                <li className={styles.pricingListItem}>
                  <Check size={13} className={styles.pricingCheck} />
                  <FormattedMessage id="homePage.pricing.premium.feature3a" defaultMessage="English learning resources: movies, subtitles, videos, songs" />
                </li>
              </ul>
            </motion.div>

            <motion.div
              className={styles.pricingCard}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.pricingHeader}>
                <h3 className={styles.pricingTier}>
                  <FormattedMessage id="homePage.pricing.lifetime.title" defaultMessage="Lifetime" />
                </h3>
                <div className={styles.pricingAmount}>
                  <span className={styles.pricingOld}>$150</span>
                  <span className={styles.pricingPriceNum}>$100</span>
                </div>
              </div>
              <ul className={styles.pricingList}>
                <li className={styles.pricingListItem}>
                  <Check size={13} className={styles.pricingCheck} />
                  <FormattedMessage id="homePage.pricing.lifetime.feature1" defaultMessage="All premium features forever" />
                </li>
                <li className={styles.pricingListItem}>
                  <Check size={13} className={styles.pricingCheck} />
                  <FormattedMessage id="homePage.pricing.lifetime.feature2" defaultMessage="One-time payment" />
                </li>
                <li className={styles.pricingListItem}>
                  <Check size={13} className={styles.pricingCheck} />
                  <FormattedMessage id="homePage.pricing.lifetime.feature3" defaultMessage="Priority VIP support" />
                </li>
              </ul>
            </motion.div>
          </div>

          <motion.div className={styles.teacherPromo} {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
            <span className={styles.teacherPromoIcon}>
              <GraduationCap size={18} strokeWidth={1.75} />
            </span>
            <p className={styles.teacherPromoText}>
              <FormattedMessage
                id="homePage.pricing.teacherPromo"
                defaultMessage="Free lifetime access for teachers! Just write to {telegramLink}"
                values={{
                  telegramLink: (
                    <a
                      href={`https://t.me/x_oneal?text=${encodeURIComponent(
                        `Hi! I'm a teacher. Please give me access. My email: ${
                          typeof window !== 'undefined'
                            ? (localStorage.getItem('userEmail') || '')
                            : ''
                        }`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.teacherPromoLink}
                    >
                      the founder
                    </a>
                  ),
                }}
              />
            </p>
          </motion.div>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.container}>
          <div className={styles.faqGrid}>
            <motion.div className={styles.faqHeaderCol} {...fadeUp}>
              <span className={styles.sectionEyebrow}>Frequently asked questions</span>
              <h2 className={styles.sectionTitle}>
                Everything you need to know.
              </h2>
            </motion.div>

            <div className={styles.faqList}>
              {faqItems.map((item, idx) => (
                <motion.div
                  key={idx}
                  className={styles.faqItem}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={{ duration: 0.45, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <button
                    className={styles.faqQuestion}
                    onClick={() => handleToggle(idx)}
                    aria-expanded={openIndexes[idx]}
                    aria-controls={`faq-answer-${idx}`}
                  >
                    <span>{item.q}</span>
                    <span className={`${styles.faqToggle} ${openIndexes[idx] ? styles.faqToggleOpen : ''}`}>
                      {openIndexes[idx] ? '−' : '+'}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openIndexes[idx] && (
                      <motion.div
                        id={`faq-answer-${idx}`}
                        variants={{
                          open: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
                          collapsed: { opacity: 0, height: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
                        }}
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        className={styles.faqAnswer}
                      >
                        <div className={styles.faqAnswerText}>{item.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div
            className={styles.ctaInner}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className={styles.ctaTitle}>
              Everything you watch, listen to, or read is a lesson.
            </h2>
            <Link to="/login" className={`${styles.btnPrimary} ${styles.ctaBtn}`}>
              Start free
              <ArrowRight size={14} className={styles.btnIcon} />
            </Link>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {isDemoModalOpen && (
          <div
            className={styles.modalBackdrop}
            onClick={handleCloseModal}
          >
            <motion.div
              className={styles.modalWindow}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={handleCloseModal}
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className={styles.modalVideoWrapper}>
                <video
                  ref={demoVideoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={styles.modalVideo}
                >
                  <source src="/movies_example.mp4" type="video/mp4" />
                </video>
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.modalFooterNote}>
                  <Headphones size={15} strokeWidth={1.75} className={styles.modalNoteIcon} />
                  <span>
                    Subtitles blur by default. Hover to reveal, drag to translate.
                  </span>
                </div>
                <Link to="/login" className={styles.modalCtaBtn} onClick={handleCloseModal}>
                  Start free
                  <ArrowRight size={12} />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
