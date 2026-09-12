import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicMediaData } from '../../hooks/usePublicMediaData';
import { SEO } from '../SEO/SEO';
import styles from './PublicContentLanding.module.css';

const PublicContentLanding: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = usePublicMediaData(slug || '');

  if (loading) {
    return <div className={styles.loadingContainer}>Загрузка материалов...</div>;
  }

  if (error || !data) {
    return (
      <div className={styles.errorContainer}>
        <h1>Ой! Мы не смогли найти этот контент.</h1>
        <Link to="/" className={styles.backLink}>Вернуться на главную</Link>
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
        <header className={styles.heroHeader} style={{ backgroundImage: `url(${data.coverImageUrl})` }}>
          <div className={styles.heroOverlay}>
            <h1 className={styles.heroTitle}>Учи английский по <span className={styles.highlightText}>{data.title}</span></h1>
            <p className={styles.heroSubtitle}>от {data.artistOrCreator}</p>
          </div>
        </header>

        <section className={styles.contentGrid}>
          <article className={styles.teaserPanel}>
            <h2 className={styles.sectionTitle}>Отрывок {isSong ? 'текста песни' : 'субтитров'}</h2>
            <div className={styles.snippetBox}>
              {data.snippet.map((line, idx) => (
                <p key={idx} className={styles.snippetLine}>{line}</p>
              ))}
              
              <div className={styles.fadeOutOverlay}>
                <span>[ Остальной текст скрыт ]</span>
              </div>
            </div>
          </article>

          <aside className={styles.vocabPanel}>
            <h2 className={styles.sectionTitle}>Полезные слова из отрывка</h2>
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
          </aside>
        </section>

        <section className={styles.ctaLockSection}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Разблокируйте полное интерактивное видео</h2>
            <p className={styles.ctaText}>
              Зарегистрируйтесь, чтобы смотреть видео целиком с умными субтитрами. 
              Кликайте на любые слова, отслеживайте свой прогресс и мгновенно отправляйте 
              карточки в наш <strong>Telegram Bot</strong> для повторения по системе FSRS!
            </p>
            <div className={styles.ctaButtons}>
              <Link to={`/subscribe?ref=media_${data.slug}`} className={styles.btnPrimary}>
                Создать аккаунт
              </Link>
              <Link to="/login" className={styles.btnSecondary}>
                У меня уже есть аккаунт
              </Link>
            </div>
            <p className={styles.guaranteeText}>Начните прямо сейчас.</p>
          </div>
        </section>
      </main>
    </>
  );
};

export default PublicContentLanding;
