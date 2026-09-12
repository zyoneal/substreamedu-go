import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import { PlanCard } from './components/PlanCard';
import { PromoSection } from './components/PromoSection';
import styles from './styles/layout.module.css';

const SubscribePage: React.FC = () => {
    const intl = useIntl();

    const plans = [
        {
            name: intl.formatMessage({ id: "paymentPage.premium.name", defaultMessage: "PREMIUM" }),
            price: "$10",
            period: "/ mo",
            features: [
                intl.formatMessage({ id: "paymentPage.premium.feature1", defaultMessage: "Unlimited translations" }),
                intl.formatMessage({ id: "paymentPage.premium.feature2", defaultMessage: "Unlimited dictionary" }),
                intl.formatMessage({ id: "paymentPage.premium.feature3", defaultMessage: "Contextual AI" }),
            ],
            highlight: true,
            badge: intl.formatMessage({ id: "paymentPage.premium.badge", defaultMessage: "POPULAR" }),
            cta: {
                text: intl.formatMessage({ id: "paymentPage.premium.cta", defaultMessage: "Get Started" }),
                link: "https://t.me/x_oneal?text=Hello,%20I%20want%20to%20purchase%20the%20Premium%20plan%20for%201%20month.",
            },
        },
        {
            name: intl.formatMessage({ id: "paymentPage.lifetime.name", defaultMessage: "LIFETIME" }),
            price: "$100",
            oldPrice: "$156",
            period: "/ one-time",
            features: [
                intl.formatMessage({ id: "paymentPage.lifetime.feature1", defaultMessage: "Forever access" }),
                intl.formatMessage({ id: "paymentPage.lifetime.feature2", defaultMessage: "One-time payment" }),
                intl.formatMessage({ id: "paymentPage.lifetime.feature3", defaultMessage: "Priority support" }),
            ],
            highlight: false,
            badge: "-36%",
            cta: {
                text: intl.formatMessage({ id: "paymentPage.lifetime.cta", defaultMessage: "Buy Lifetime" }),
                link: "https://t.me/x_oneal?text=Hello,%20I%20want%20to%20purchase%20the%20Lifetime%20plan.",
            },
        },
    ];

    return (
        <div className={styles.themeContainer}>
            <main className={styles.mainContent}>
                <section className={styles.heroSection}>
                    <div className={styles.heroContent}>
                        <div className={styles.headerGroup}>
                            <span className={styles.eyebrow}>08 // PLANS & PRICING</span>
                            <h1 className={styles.displayTitle}>
                                <FormattedMessage id="paymentPage.title" defaultMessage="Unlock your full learning potential." />
                            </h1>
                        </div>
                        <p className={styles.description}>
                            <FormattedMessage
                                id="paymentPage.description"
                                defaultMessage="Experience the future of language learning with our advanced AI-driven tools. Choose a plan that matches your ambition."
                            />
                        </p>
                    </div>
                </section>

                <section id="pricing" className={styles.pricingSection}>
                    <div className={styles.plansGrid}>
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan.name}
                                name={plan.name}
                                price={plan.price}
                                period={plan.period}
                                oldPrice={plan.oldPrice}
                                features={plan.features}
                                ctaText={plan.cta.text}
                                ctaLink={plan.cta.link}
                                highlight={plan.highlight}
                                badge={plan.badge}
                            />
                        ))}
                    </div>

                    <div className={styles.teacherPromo}>
                        <span className={styles.teacherPromoIcon}><GraduationCap size={20} className="text-primary shrink-0" /></span>
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
                    </div>

                    <PromoSection />
                </section>
            </main>
        </div>
    );
};

export default SubscribePage;
