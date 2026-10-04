import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, BookOpen, Send, Lock } from 'lucide-react';
import { usePublicMediaData } from '../../hooks/usePublicMediaData';
import { SEO } from '../SEO/SEO';
import styles from './PublicContentLanding.module.css';

const PublicContentLanding: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = usePublicMediaData(slug || '');

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={styles.loadingText}
        >
          Loading materials...
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.errorContainer}>
        <h1>Oops! We couldn't find this content.</h1>
        <Link to="/" className={styles.backLink}>Back to home</Link>
      </div>
    );
  }

  const isSong = data.type === 'song';
  const pageTitle = `Learn English with ${data.title} by ${data.artistOrCreator}`;
  const pageDescription = `Improve your English vocabulary by studying the ${isSong ? 'lyrics' : 'subtitles'} of "${data.title}" by ${data.artistOrCreator}. See translations, transcriptions, and practice with spaced repetition.`;
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "name": pageTitle,
    "description": pageDescription,
    "learningResourceType": "Interactive Video",
    "about": {
      "@type": isSong ? "MusicRecording" : "Movie",
      "name": data.title,
      "byArtist": {
        "@type": "Person",
        "name": data.artistOrCreator
      }
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <>
      <SEO 
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={`https://substreamedu.com/learn/media/${data.slug}`}
        type="article"
        image={data.coverImageUrl}
        jsonLd={jsonLd}
      />

      <main className={styles.container}>
        {/* Cinematic Background Gradient */}
        <div className={styles.ambientBackground}>
          <div className={styles.glowOrb} style={{ background: `radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)` }} />
        </div>

        <motion.header 
          initial="hidden" 
          animate="visible" 
          variants={fadeUp} 
          className={styles.heroHeader}
        >
          <div className={styles.heroImageWrapper}>
            <img src={data.coverImageUrl} alt={data.title} className={styles.heroImage} />
            <div className={styles.heroGradient} />
          </div>
          
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              <Sparkles size={14} />
              {isSong ? 'SONG LESSON' : 'MOVIE LESSON'}
            </span>
            <h1 className={styles.heroTitle}>
              Learn English with <br/>
              <span className={styles.highlightText}>{data.title}</span>
            </h1>
            <p className={styles.heroSubtitle}>by {data.artistOrCreator}</p>
          </div>
        </motion.header>

        <section className={styles.contentGrid}>
          <motion.article 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp} 
            className={styles.teaserPanel}
          >
            <div className={styles.panelHeader}>
              <Play size={18} className={styles.panelIcon} />
              <h2 className={styles.sectionTitle}>Preview {isSong ? 'Lyrics' : 'Scene'}</h2>
            </div>
            
            <div className={styles.snippetBox}>
              {data.snippet.map((line, idx) => (
                <p key={idx} className={styles.snippetLine}>{line}</p>
              ))}
              
              <div className={styles.fadeOutOverlay}>
                <Lock size={16} className={styles.lockIcon} />
                <span>Full content is locked</span>
              </div>
            </div>
          </motion.article>

          <motion.aside 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp} 
            className={styles.vocabPanel}
          >
            <div className={styles.panelHeader}>
              <BookOpen size={18} className={styles.panelIcon} />
              <h2 className={styles.sectionTitle}>Key Vocabulary</h2>
            </div>
            
            <ul className={styles.vocabList}>
              {data.highlightedWords.map((item, idx) => (
                <li key={idx} className={styles.vocabCard}>
                  <div className={styles.vocabMain}>
                    <strong className={styles.vocabWord}>{item.word}</strong>
                    <span className={styles.transcription}>{item.transcription}</span>
                  </div>
                  <div className={styles.translation}>{item.translation}</div>
                </li>
              ))}
            </ul>
          </motion.aside>
        </section>

        <motion.section 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true }}
          variants={fadeUp} 
          className={styles.ctaLockSection}
        >
          <div className={styles.ctaCard}>
            <div className={styles.ctaCardGlow} />
            <h2 className={styles.ctaTitle}>Unlock the Full Interactive Lesson</h2>
            <p className={styles.ctaText}>
              Join for free to watch the full video with smart subtitles. 
              Highlight any word or phrase you don't know, save it to your dictionary, and practice with our <strong>Telegram Bot</strong> using spaced repetition!
            </p>
            <div className={styles.ctaFeatures}>
              <div className={styles.featureItem}><Sparkles size={16}/> Smart Subtitles</div>
              <div className={styles.featureItem}><BookOpen size={16}/> Instant Translation</div>
              <div className={styles.featureItem}><Send size={16}/> Telegram Bot Sync</div>
            </div>
            <div className={styles.ctaButtons}>
              <Link to={`/subscribe?ref=media_${data.slug}`} className={styles.btnPrimary}>
                Start Learning for Free
              </Link>
              <Link to="/login" className={styles.btnSecondary}>
                I already have an account
              </Link>
            </div>
          </div>
        </motion.section>
      </main>
    </>
  );
};

export default PublicContentLanding;
