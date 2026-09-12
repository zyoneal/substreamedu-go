import React, { useMemo } from 'react';
import styles from './ScrollingTextWall.module.css';

interface TextLine {
  text: string;
  highlights: string[];
}

const TEXT_LINES: TextLine[] = [
  { text: 'Real English is learned in context, not isolated drills.', highlights: ['context'] },
  { text: 'The movie was so captivating I could not stop watching.', highlights: ['captivating'] },
  { text: 'Every dialogue builds instinctive fluency, choice by choice.', highlights: ['instinctive', 'fluency'] },
  { text: 'She noticed a remarkable change in her listening speed.', highlights: ['remarkable'] },
  { text: 'Drag and select whole phrases without losing meaning.', highlights: ['whole phrases', 'meaning'] },
  { text: 'Songs and synchronized lyrics make rhythm second nature.', highlights: ['second nature'] },
  { text: 'Clarity is our weapon. Immersion is our armor.', highlights: ['Clarity', 'Immersion'] },
  { text: 'He always trains his English with content he loves.', highlights: ['trains'] },
  { text: 'Subtitles reveal spoken nuances books never taught.', highlights: ['spoken nuances'] },
  { text: 'She felt confident after practicing with real cinema.', highlights: ['confident', 'cinema'] },
  { text: 'Understanding fast natural speech requires patience and immersion.', highlights: ['immersion'] },
  { text: 'They achieved natural fluency through daily active listening.', highlights: ['natural fluency'] },
  { text: 'The film had an unforgettable ending that surprised everyone.', highlights: ['unforgettable'] },
  { text: 'Singing along with lyrics builds flawless pronunciation.', highlights: ['flawless', 'pronunciation'] },
  { text: 'We should consider learning the language as it is spoken.', highlights: ['spoken'] },
  { text: 'The experience of immersion completely transformed his comprehension.', highlights: ['transformed'] },
  { text: 'Words in memory fade unless reinforced in living context.', highlights: ['living context'] },
  { text: 'She gradually became comfortable speaking without hesitation.', highlights: ['without hesitation'] },
  { text: 'Belonging in a language is not given. It is demonstrated.', highlights: ['demonstrated'] },
  { text: 'Master idioms, slang, and phrasal verbs naturally.', highlights: ['idioms', 'phrasal verbs'] },
];

function renderLine(line: TextLine, key: number) {
  const { text, highlights } = line;
  
  if (highlights.length === 0) {
    return <span key={key} className={styles.textLine}>{text}</span>;
  }

  
  const escapedHighlights = highlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedHighlights.join('|')})`, 'g');
  const parts = text.split(regex);

  return (
    <span key={key} className={styles.textLine}>
      {parts.map((part, i) =>
        highlights.includes(part) ? (
          <strong key={i} className={styles.highlight}>{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

const ScrollingTextWall: React.FC = () => {
  
  const tripled = useMemo(() => [...TEXT_LINES, ...TEXT_LINES, ...TEXT_LINES], []);

  return (
    <div className={styles.wall} aria-hidden="true">
      <div className={styles.perspective}>
        <div className={styles.scrollTrack}>
          {tripled.map((line, idx) => renderLine(line, idx))}
        </div>
      </div>
      {}
      <div className={styles.fadeTop} />
      <div className={styles.fadeBottom} />
      <div className={styles.fadeLeft} />
      <div className={styles.fadeRight} />
      <div className={styles.vignette} />
    </div>
  );
};

export default ScrollingTextWall;
