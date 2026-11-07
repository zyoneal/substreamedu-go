import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
} from 'framer-motion';
import { ArrowRight, Film, Play, Music, Sparkles, BookOpen } from 'lucide-react';
import { SEO } from '../SEO/SEO';
import ScrollingTextWall from './ScrollingTextWall';
import HeroCinemaPlayer from './HeroCinemaPlayer';
import {
  HERO_PHRASES,
  SOURCE_ITEMS,
  VALUE_ITEMS,
  MANIFESTO_TEXT,
  FEATURES,
  ORGANIZATION_JSON_LD,
  FAQ_JSON_LD,
} from './homePageData';
import HomeInteractiveDemoSection from './HomeInteractiveDemoSection';
import HomePricingSection from './HomePricingSection';
import HomeReviewsFaqSection from './HomeReviewsFaqSection';
import HomeDemoModal from './HomeDemoModal';
import styles from './HomePage.module.css';

import { usePixzenTheme } from './pixzen/usePixzenTheme';
import TypingHeadline from './pixzen/TypingHeadline';
import BrandMarquee from './pixzen/BrandMarquee';
import ManifestoReveal from './pixzen/ManifestoReveal';

const HomePage: React.FC = () => {
  usePixzenTheme();

  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

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
  const heroContentY = useTransform(heroScrollProgress, [0, 1], [0, 48]);
  const heroContentOpacity = useTransform(heroScrollProgress, [0, 0.75, 1], [1, 0.85, 0.2]);

  // Sticky mobile CTA: show after scrolling past ~400px
  const [showMobileCta, setShowMobileCta] = useState(false);
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setShowMobileCta(latest > 0.08);
  });

  return (
    <div className={styles.page} ref={pageRef}>
      <div className="pixzenGrain" aria-hidden="true" />
      <motion.div
        className={styles.scrollProgressBar}
        style={{ scaleX: scrollProgressSpring }}
        aria-hidden="true"
      />

      <SEO
        title="Learn English with Movies & Music | SubStreamEdu"
        description="Learn English with movies, music, and interactive subtitles. Highlight any phrase to build your smart spaced-repetition dictionary."
        canonicalUrl="https://substreamedu.com/"
        jsonLd={ORGANIZATION_JSON_LD}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroLayout}>
          <motion.div
            className={styles.heroContent}
            style={{ y: heroContentY, opacity: heroContentOpacity }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.heroEyebrow}>English immersion</span>
            <h1 className={styles.heroTitle} aria-label={HERO_PHRASES.join('. ')}>
              <TypingHeadline phrases={HERO_PHRASES} />
            </h1>

            <p className={styles.heroSub}>
              Listen to native speech before reading. Blur subtitles, delay text by two seconds, and
              highlight any phrase to translate in context.
            </p>

            <div className={styles.heroActions}>
              <Link
                to="/youtube-demo?onboarding=true"
                className={styles.btnPrimary}
                data-cursor="action"
                data-cursor-text="Try Free"
              >
                Try with a YouTube video
                <ArrowRight size={14} className={styles.btnIcon} />
              </Link>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsDemoModalOpen(true)}
                data-cursor="action"
                data-cursor-text="Video Walkthrough"
              >
                <Play size={14} className={styles.btnIcon} />
                Watch demo
              </button>
            </div>

            <div className={styles.heroSocialProof}>
              <span className={styles.heroSocialDot} />
              <span>Free · 100 translations · No credit card</span>
            </div>

            <HeroCinemaPlayer />
          </motion.div>

          <motion.div
            className={styles.heroWallContainer}
            style={{ y: wallY, scale: wallScale }}
            data-cursor="stream"
            data-cursor-text="Cinema Stream"
          >
            <ScrollingTextWall />
          </motion.div>
        </div>
      </section>

      <section className={styles.sourcesStrip} aria-label="Content sources">
        <BrandMarquee items={SOURCE_ITEMS} ariaLabel="Learn from" />
      </section>

      <section className={styles.manifestoSection}>
        <div className={styles.container}>
          <span className={styles.manifestoLabel}>Method</span>
          <ManifestoReveal text={MANIFESTO_TEXT} />
        </div>
      </section>

      <section className={styles.valuesBand} aria-label="Principles">
        <BrandMarquee items={VALUE_ITEMS} variant="display" ariaLabel="Principles" />
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
                <div className={styles.featureCardArtifact}>{item.artifact}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className={styles.tryDemoDock}
            data-testid="hero-demo-dock"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.tryDemoDockLabel}>
              <FormattedMessage
                id="homePage.hero.interactiveDemosShort"
                defaultMessage="Interactive Demos"
              />
            </span>
            <div className={styles.tryDemoDockLinks}>
              <Link to="/youtube-demo" className={styles.tryDemoDockItem}>
                <Film size={14} />
                <FormattedMessage id="homePage.hero.demoMovieTitle" defaultMessage="Movie Player" />
              </Link>
              <Link to="/songs-demo" className={styles.tryDemoDockItem}>
                <Music size={14} />
                <FormattedMessage id="homePage.hero.demoMusicTitle" defaultMessage="Synced Lyrics" />
              </Link>
              <Link to="/books" className={styles.tryDemoDockItem}>
                <BookOpen size={14} />
                <FormattedMessage id="homePage.hero.demoBooksTitle" defaultMessage="Graded Books" />
              </Link>
              <Link to="/texts-demo" className={styles.tryDemoDockItem}>
                <Sparkles size={14} />
                <FormattedMessage id="homePage.hero.demoStoriesTitle" defaultMessage="AI Stories" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <HomeInteractiveDemoSection />
      <HomePricingSection />
      <HomeReviewsFaqSection />

      <HomeDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />

      {/* Sticky mobile CTA bar — appears after scrolling past hero */}
      <AnimatePresence>
        {showMobileCta && (
          <motion.div
            className={styles.stickyMobileCta}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link to="/youtube-demo?onboarding=true" className={styles.stickyMobileCtaBtn}>
              Try free · 100 translations
              <ArrowRight size={13} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
