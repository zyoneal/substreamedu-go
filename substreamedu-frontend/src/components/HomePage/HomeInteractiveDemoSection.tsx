import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIntl, FormattedMessage } from 'react-intl';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Plus, X, MousePointer, Eye } from 'lucide-react';
import { AuthService } from '../../services/AuthService';
import { GuestLimitService } from '../../services/GuestLimitService';
import styles from './HomePage.module.css';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

export const HomeInteractiveDemoSection: React.FC = () => {
  const intl = useIntl();
  const [isSubtitleRevealed, setIsSubtitleRevealed] = useState(false);
  const [isDemoWordAdded, setIsDemoWordAdded] = useState(false);

  return (
    <section className={styles.demoSection}>
      <div className={styles.container}>
        <div className={styles.demoLayout}>
          <motion.div className={styles.demoText} {...fadeUp}>
            <span className={styles.sectionEyebrow}>How it works</span>
            <h2 className={styles.sectionTitle}>
              Drag to select. Translate in context. Save to dictionary.
            </h2>
          </motion.div>

          <motion.div
            className={styles.subtitleDemo}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
          >
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
              className={`${styles.subtitleLineBlurred} ${
                isSubtitleRevealed ? styles.subtitleLineUnblurredActive : ''
              }`}
              onClick={() => setIsSubtitleRevealed((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsSubtitleRevealed((prev) => !prev);
                }
              }}
              role="button"
              tabIndex={0}
              title="Click or hover cursor to unblur and reveal"
              data-cursor="reveal"
              data-cursor-text={isSubtitleRevealed ? 'Click to blur' : 'Hover to reveal'}
            >
              We should probably take it for granted at this point.
            </div>

            <div className={styles.subtitleLineRevealed}>
              Hey relax, it&apos;s{' '}
              <span className={styles.selectedPhrase} data-cursor="drag" data-cursor-text="Drag phrase">
                no problem
                <span className={styles.selectionCursor} />
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
                <FormattedMessage id="homePage.demo.phraseMeaning" defaultMessage="без проблем" />
              </span>
              <button
                className={`${styles.addToDictBtn} ${isDemoWordAdded ? styles.addToDictBtnSaved : ''}`}
                type="button"
                onClick={() => {
                  if (!AuthService.getUserEmail()) {
                    GuestLimitService.setPendingSaveWord({
                      resourceName: 'Active Listening Demo',
                      highlightedText: 'no problem',
                      context: "Hey relax, it's no problem, I'll take care of it.",
                      translation: "no problem / you're welcome",
                      definition: 'used to say that something is easy to do or that one is happy to do it',
                      returnUrl: '/youtube-demo',
                    });
                    GuestLimitService.triggerGuestSavePrompt();
                    setIsDemoWordAdded(true);
                  } else {
                    setIsDemoWordAdded((prev) => !prev);
                  }
                }}
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
                          defaultMessage: 'без проблем',
                        }),
                      }}
                    />
                  </span>
                </span>
              </div>
            </div>

            <div className={styles.demoCtaRow}>
              <Link to="/youtube-demo" className={styles.demoCtaButton}>
                <span>Try interactive player with movie scene &amp; subtitles</span>
                <ArrowRight size={14} className={styles.demoCtaArrow} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HomeInteractiveDemoSection;

