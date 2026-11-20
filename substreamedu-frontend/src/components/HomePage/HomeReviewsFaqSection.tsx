import React, { useState, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import MagneticLink from './pixzen/MagneticLink';
import { buildFaqItems } from './homePageData';
import styles from './HomePage.module.css';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

export const HomeReviewsFaqSection: React.FC = () => {
  const intl = useIntl();
  const faqItems = buildFaqItems(intl);

  const [openIndexes, setOpenIndexes] = useState<boolean[]>(Array(faqItems.length).fill(false));
  useEffect(() => {
    setOpenIndexes(Array(faqItems.length).fill(false));
  }, [faqItems.length]);

  const handleToggle = useCallback((idx: number) => {
    setOpenIndexes((prev) => prev.map((open, i) => (i === idx ? !open : open)));
  }, []);

  return (
    <>
      <section className={styles.faqSection}>
        <div className={styles.container}>
          <div className={styles.faqGrid}>
            <motion.div className={styles.faqHeaderCol} {...fadeUp}>
              <span className={styles.sectionEyebrow}>Frequently asked questions</span>
              <h2 className={styles.sectionTitle}>Everything you need to know.</h2>
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
                          open: {
                            opacity: 1,
                            height: 'auto',
                            transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                          },
                          collapsed: {
                            opacity: 0,
                            height: 0,
                            transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                          },
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
            <h2 className={styles.ctaTitle}>Learn English from the content you already enjoy.</h2>
            <MagneticLink to="/login" className={`${styles.btnPrimary} ${styles.ctaBtn} ${styles.ctaMagnet}`}>
              Start free
              <ArrowRight size={14} className={styles.btnIcon} />
            </MagneticLink>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default HomeReviewsFaqSection;

