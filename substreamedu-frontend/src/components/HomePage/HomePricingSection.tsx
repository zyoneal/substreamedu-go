import React from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { motion } from 'framer-motion';
import { Check, ArrowRight, CreditCard, GraduationCap } from 'lucide-react';
import styles from './HomePage.module.css';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

export const HomePricingSection: React.FC = () => {
  return (
    <section className={styles.pricingSection}>
      <div className={styles.container}>
        <motion.div className={styles.pricingSectionHeader} {...fadeUp}>
          <span className={styles.sectionEyebrow}>Pricing</span>
          <h2 className={styles.sectionTitle}>Simple, transparent pricing.</h2>
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
                <FormattedMessage
                  id="homePage.pricing.free.feature1"
                  defaultMessage="Up to 100 translations"
                />
              </li>
              <li className={styles.pricingListItem}>
                <Check size={13} className={styles.pricingCheck} />
                <FormattedMessage
                  id="homePage.pricing.free.feature2"
                  defaultMessage="Up to 50 saves to dictionary"
                />
              </li>
              <li className={styles.pricingListItem}>
                <Check size={13} className={styles.pricingCheck} />
                <FormattedMessage
                  id="homePage.pricing.free.feature3"
                  defaultMessage="Google Translate (no context)"
                />
              </li>
            </ul>
            <Link to="/login" className={styles.pricingBtnSecondary}>
              <FormattedMessage id="homePage.pricing.free.cta" defaultMessage="Start free" />
            </Link>
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
                <FormattedMessage
                  id="homePage.pricing.premium.feature1"
                  defaultMessage="Unlimited translations"
                />
              </li>
              <li className={styles.pricingListItem}>
                <Check size={13} className={styles.pricingCheck} />
                <FormattedMessage
                  id="homePage.pricing.premium.feature2"
                  defaultMessage="Unlimited saves to dictionary"
                />
              </li>
              <li className={styles.pricingListItem}>
                <Check size={13} className={styles.pricingCheck} />
                <FormattedMessage
                  id="homePage.pricing.premium.feature3"
                  defaultMessage="Contextual AI translation"
                />
              </li>
              <li className={styles.pricingListItem}>
                <Check size={13} className={styles.pricingCheck} />
                <FormattedMessage
                  id="homePage.pricing.premium.feature3a"
                  defaultMessage="English learning resources: movies, subtitles, videos, songs, books"
                />
              </li>
            </ul>
            <Link to="/subscribe" className={styles.pricingBtnPrimary}>
              <FormattedMessage id="homePage.pricing.premium.cta" defaultMessage="Subscribe" />
              <ArrowRight size={13} />
            </Link>
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
                <FormattedMessage
                  id="homePage.pricing.lifetime.feature1"
                  defaultMessage="All premium features forever"
                />
              </li>
              <li className={styles.pricingListItem}>
                <Check size={13} className={styles.pricingCheck} />
                <FormattedMessage
                  id="homePage.pricing.lifetime.feature2"
                  defaultMessage="One-time payment"
                />
              </li>
              <li className={styles.pricingListItem}>
                <Check size={13} className={styles.pricingCheck} />
                <FormattedMessage
                  id="homePage.pricing.lifetime.feature3"
                  defaultMessage="Priority VIP support"
                />
              </li>
            </ul>
            <Link to="/subscribe?plan=lifetime" className={styles.pricingBtnLifetime}>
              <CreditCard size={13} />
              <FormattedMessage
                id="homePage.pricing.lifetime.cta"
                defaultMessage="Buy lifetime access"
              />
            </Link>
          </motion.div>
        </div>

        <motion.div
          className={styles.teacherPromo}
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.2 }}
        >
          <span className={styles.teacherPromoIcon}>
            <GraduationCap size={18} strokeWidth={1.75} />
          </span>
          <p className={styles.teacherPromoText}>
            <FormattedMessage
              id="homePage.pricing.teacherPromo"
              defaultMessage="Free lifetime access for teachers. Write to {telegramLink}"
              values={{
                telegramLink: (
                  <a
                    href={`https://t.me/x_oneal?text=${encodeURIComponent(
                      `Hi! I'm a teacher. Please give me access. My email: ${
                        typeof window !== 'undefined' ? localStorage.getItem('userEmail') || '' : ''
                      }`,
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
  );
};

export default HomePricingSection;

