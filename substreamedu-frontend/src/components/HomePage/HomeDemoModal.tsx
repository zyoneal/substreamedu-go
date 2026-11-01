import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Film, X, Headphones, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/modal';
import styles from './HomePage.module.css';

interface HomeDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HomeDemoModal: React.FC<HomeDemoModalProps> = ({ isOpen, onClose }) => {
  const demoVideoRef = useRef<HTMLVideoElement>(null);

  const handleClose = () => {
    if (demoVideoRef.current) {
      demoVideoRef.current.pause();
    }
    onClose();
  };

  useEffect(() => {
    if (isOpen && demoVideoRef.current) {
      const playPromise = demoVideoRef.current.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      className={styles.demoModal}
      ariaLabel="Video Walkthrough Demo"
    >
      <div className={styles.demoModalHeader}>
        <div className={styles.demoModalHeaderTitle}>
          <Film size={15} className={styles.demoModalHeaderIcon} />
          <span>Interactive Subtitle Demo</span>
        </div>
        <button
          type="button"
          className={styles.modalCloseBtn}
          onClick={handleClose}
          aria-label="Close modal"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div className={styles.modalVideoWrapper}>
        <video
          ref={demoVideoRef}
          autoPlay
          loop
          muted
          playsInline
          width={1110}
          height={880}
          className={styles.modalVideo}
        >
          <source src="/movies_example.mp4" type="video/mp4" />
        </video>
      </div>

      <div className={styles.modalFooter}>
        <div className={styles.modalFooterNote}>
          <Headphones size={15} strokeWidth={1.75} className={styles.modalNoteIcon} />
          <span>Subtitles blur by default. Hover to reveal, drag to translate.</span>
        </div>
        <Link to="/login" className={styles.modalCtaBtn} onClick={handleClose}>
          Start free
          <ArrowRight size={12} />
        </Link>
      </div>
    </Modal>
  );
};

export default HomeDemoModal;

