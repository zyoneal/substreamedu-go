import React from 'react';
import { IntlShape } from 'react-intl';
import {
  Film,
  Play,
  Music,
  Sparkles,
  Headphones,
  MousePointer,
  Cpu,
  BookmarkCheck,
  GraduationCap,
  Send,
  Sliders,
  Volume2,
  BookOpen,
} from 'lucide-react';
import { MarqueeItem } from './pixzen/BrandMarquee';
import styles from './HomePage.module.css';

export const HERO_PHRASES: readonly string[] = [
  'Learn from movies',
  'Learn from music',
  'Learn from any text',
];

export const SOURCE_ITEMS: readonly MarqueeItem[] = [
  { label: 'YouTube', icon: <Play size={16} strokeWidth={1.75} /> },
  { label: 'Movies & series', icon: <Film size={16} strokeWidth={1.75} /> },
  { label: 'Song lyrics', icon: <Music size={16} strokeWidth={1.75} /> },
  { label: 'Graded books', icon: <BookOpen size={16} strokeWidth={1.75} /> },
  { label: 'Podcasts', icon: <Headphones size={16} strokeWidth={1.75} /> },
  { label: 'AI stories', icon: <Sparkles size={16} strokeWidth={1.75} /> },
  { label: 'Your own texts', icon: <BookmarkCheck size={16} strokeWidth={1.75} /> },
  { label: 'Flashcards', icon: <GraduationCap size={16} strokeWidth={1.75} /> },
];

export const VALUE_ITEMS: readonly MarqueeItem[] = [
  { label: 'Hear first' },
  { label: 'Select in context' },
  { label: 'Save scene timestamps' },
  { label: 'Spaced repetition reviews' },
];

export const MANIFESTO_TEXT =
  'Language sticks when you hear it in context. SubStreamEdu turns dialogues, songs, and books into active listening exercises with instant translations.';

export interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
  artifact: React.ReactNode;
}

export const FEATURES: readonly FeatureItem[] = [
  {
    icon: <Headphones size={20} strokeWidth={1.75} />,
    title: 'Hear first, read second.',
    desc: 'Subtitles blur by default. Hover to reveal. An optional 2\u2011second delay lets you listen before reading.',
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
          let&apos;s{' '}
          <span className={styles.miniSelectionHighlight}>
            call it a day
            <span className={styles.miniSelectionCursor} />
          </span>
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
    title: 'Save words with scene context.',
    desc: 'Save words or phrases with audio, phonetics, and the exact scene timestamp.',
    artifact: (
      <div className={styles.miniDictArtifact} data-cursor="action" data-cursor-text="Scene Dictionary">
        <div className={styles.miniDictHeader}>
          <span className={styles.miniDictWord}>hunch</span>
          <span className={styles.miniDictPhonetic}>/hʌntʃ/</span>
        </div>
        <div className={styles.miniDictMeta}>
          <span className={styles.miniDictTag}>
            <Volume2 size={10} strokeWidth={1.75} /> 0:02
          </span>
          <span className={styles.miniDictTag}>
            <Film size={10} strokeWidth={1.75} /> S01E03 · 14:20
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: <Cpu size={20} strokeWidth={1.75} />,
    title: 'FSRS spaced repetition.',
    desc: 'The FSRS algorithm calculates review intervals from your recall history to maintain retention.',
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
          <span>FSRS 94.2% retention</span>
        </div>
      </div>
    ),
  },
  {
    icon: <Send size={20} strokeWidth={1.75} />,
    title: 'Morning reviews in Telegram.',
    desc: 'Flashcards and quizzes arrive in Telegram every morning at 9:00 AM.',
    artifact: (
      <div className={styles.miniTgArtifact} data-cursor="action" data-cursor-text="Telegram Delivery">
        <div className={styles.miniTgHeader}>
          <span className={styles.miniTgApp}>
            <Send size={10} strokeWidth={1.75} /> Telegram
          </span>
          <span className={styles.miniTgTime}>9:00 AM</span>
        </div>
        <div className={styles.miniTgMsg}>20 flashcards ready for morning review</div>
      </div>
    ),
  },
  {
    icon: <Film size={20} strokeWidth={1.75} />,
    title: 'Movies · Songs · Books · AI',
    desc: 'YouTube, your own files, synced lyrics, graded EPUB books, or AI stories by level.',
    artifact: (
      <div className={styles.miniFormatsArtifact} data-cursor="action" data-cursor-text="4 Media Formats">
        <span className={styles.miniFormatPill}>YouTube</span>
        <span className={styles.miniFormatPill}>Synced Lyrics</span>
        <span className={styles.miniFormatPill}>Graded Books</span>
        <span className={styles.miniFormatPill}>AI Stories</span>
      </div>
    ),
  },
];

export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

export function buildFaqItems(intl: IntlShape): FaqItem[] {
  return [
    {
      q: intl.formatMessage({
        id: 'homePage.faq.q1',
        defaultMessage: 'What content can I learn with in SubStreamEdu?',
      }),
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
              your own files (<span className={styles.faqCodeBadge}>.mp4</span>,{' '}
              <span className={styles.faqCodeBadge}>.mkv</span>,{' '}
              <span className={styles.faqCodeBadge}>.srt</span>) from torrents or via our Telegram bot{' '}
              <a href="https://t.me/cinemagic_hd_bot" target="_blank" rel="noopener noreferrer">
                @cinemagic_hd_bot
              </a>
              .
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
              type or paste any text you wrote, or generate interactive stories tailored to your exact CEFR
              level (A1, A2, B1, B2, C1) and any chosen topic (e.g. Travel, Job Interview, Tech).
            </div>
          </li>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>5</span>
            <div>
              <span className={styles.faqItemTitle}>Subtitles &amp; Books as Text:</span>
              read full movie transcripts or graded EPUB/TXT books as interactive text. Highlight words and
              phrases with your cursor just like copying text.
            </div>
          </li>
        </ul>
      ),
    },
    {
      q: intl.formatMessage({ id: 'homePage.faq.q2', defaultMessage: 'How to upload a video?' }),
      a: (
        <ul className={styles.faqListWrapper}>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>1</span>
            <div>
              Upload any video file (<span className={styles.faqCodeBadge}>.mp4</span> or{' '}
              <span className={styles.faqCodeBadge}>.mkv</span>) with the movie title in the filename, or paste
              a YouTube link.
            </div>
          </li>
          <li className={styles.faqListItem}>
            <span className={styles.faqBulletNumber}>2</span>
            <div>
              Choose matching subtitles from the suggested list, or upload your own{' '}
              <span className={styles.faqCodeBadge}>.srt</span> file.
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
      a: intl.formatMessage({
        id: 'homePage.faq.a3',
        defaultMessage:
          'Yes. You get 100 translations and 50 saved words for free. Subscriptions unlock unlimited translations and full features.',
      }),
    },
    {
      q: intl.formatMessage({
        id: 'homePage.faq.q4',
        defaultMessage: 'What is Active Listening Mode and default subtitle blur?',
      }),
      a: (
        <>
          {intl.formatMessage({
            id: 'homePage.faq.a4',
            defaultMessage:
              'Subtitles blur by default so you listen to native speech before reading. Hover over the subtitle or tap on mobile to reveal it. You can also turn on a 2-second subtitle delay in the player settings.',
          })}{' '}
          <a href="https://www.youtube.com/watch?v=uH1aDCjypKg" target="_blank" rel="noopener noreferrer">
            YouTube demo
          </a>
        </>
      ),
    },
    {
      q: intl.formatMessage({
        id: 'homePage.faq.q5',
        defaultMessage: 'What makes the Smart Dictionary special?',
      }),
      a: (
        <>
          {intl.formatMessage({
            id: 'homePage.faq.a5',
            defaultMessage:
              'SubStreamEdu analyzes sentence context to translate idioms and phrasal verbs accurately. Every saved word includes pronunciation audio, phonetics, and the video timestamp, scheduled for review with the FSRS algorithm.',
          })}{' '}
          <a href="https://youglish.com/" target="_blank" rel="noopener noreferrer">
            YouGlish
          </a>
        </>
      ),
    },
    {
      q: intl.formatMessage({
        id: 'homePage.faq.q6',
        defaultMessage: 'How do reviews work in Telegram?',
      }),
      a: intl.formatMessage({
        id: 'homePage.faq.a6',
        defaultMessage:
          'Your dictionary connects directly to the Telegram bot. Each morning the bot sends review flashcards, quick quizzes, and progress stats.',
      }),
    },
  ];
}

export const ORGANIZATION_JSON_LD = {
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

export const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What content can I learn with in SubStreamEdu?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'YouTube: paste any video, podcast, interview, or lecture link. Movies & Series: your own files (.mp4, .mkv, .srt). Music & Songs: learn English with synchronized lyrics. Custom & AI Texts: type or paste text, or generate interactive stories tailored to your CEFR level (A1-C1) and topic. Subtitles & Books as Text: read full movie transcripts or graded EPUB/TXT books as interactive text.',
      },
    },
    {
      '@type': 'Question',
      name: 'How to upload a video?',
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
        text: 'Yes. You get 100 translations and 50 saved words for free. Subscriptions unlock unlimited translations and full features.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is Active Listening Mode and default subtitle blur?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Subtitles blur by default so you listen to native speech before reading. Hover over the subtitle or tap on mobile to reveal it. You can also turn on a 2-second subtitle delay in the player settings.',
      },
    },
    {
      '@type': 'Question',
      name: 'What makes the Smart Dictionary special?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SubStreamEdu analyzes sentence context to translate idioms and phrasal verbs accurately. Every saved word includes pronunciation audio, phonetics, and the video timestamp, scheduled for review with the FSRS algorithm.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do reviews work in Telegram?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your dictionary connects directly to the Telegram bot. Each morning the bot sends review flashcards, quick quizzes, and progress stats.',
      },
    },
  ],
};

