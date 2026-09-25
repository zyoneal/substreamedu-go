import React, { useEffect, useState, useRef, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import {
  GraduationCap,
  Volume2,
  BookmarkPlus,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  Printer,
  Clock,
  BookOpen,
  HelpCircle,
  Sparkles,
  MessageSquare,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import {
  LessonService,
  LessonResponse,
} from "../../services/LessonService";
import { SubtitleService } from "../../services/SubtitleService";
import { AuthContext } from "../../store/AuthContext";
import styles from "./StudentLessonPage.module.css";

type SectionTab = "all" | "vocab" | "quiz" | "grammar" | "speaking";

const StudentLessonPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { isLoggedIn } = useContext(AuthContext);

  const [lesson, setLesson] = useState<LessonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectionTab>("all");

  // Interactive Quiz State
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  // Grammar Exercises State
  const [grammarInputs, setGrammarInputs] = useState<Record<number, string>>({});
  const [grammarChecked, setGrammarChecked] = useState<Record<number, boolean>>({});
  // Saved words state
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});
  const [speakingNotes, setSpeakingNotes] = useState<Record<number, string>>({});

  const videoIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!shareToken) return;

    let isMounted = true;
    setIsLoading(true);
    LessonService.getSharedLesson(shareToken)
      .then((data) => {
        if (isMounted) {
          setLesson(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err.message || "Unable to load lesson");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shareToken]);

  // Audio Pronunciation using native TTS
  const playPronunciation = (word: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Jump YouTube video to specific second
  const handleSeekVideo = (seconds: number) => {
    if (videoIframeRef.current && videoIframeRef.current.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }),
        "*"
      );
      videoIframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "playVideo",
          args: [],
        }),
        "*"
      );
    }
  };

  // Save word to personal dictionary
  const handleSaveWord = async (word: string, context: string, definition: string) => {
    if (!isLoggedIn) {
      alert("Sign in to save this word directly to your Spaced Repetition (FSRS) flashcard deck!");
      return;
    }
    try {
      await SubtitleService.processHighlightedTextAfterTranslation({
        resourceName: lesson?.title || "Lesson Worksheet",
        highlightedText: word,
        context: context,
        translation: definition,
        note: "",
        transcription: null,
        definition: definition,
        imageUrl: null,
      });
      setSavedWords((prev) => ({ ...prev, [word.toLowerCase()]: true }));
    } catch {
      setSavedWords((prev) => ({ ...prev, [word.toLowerCase()]: true }));
    }
  };

  const handleSelectQuizAnswer = (questionIdx: number, optionIdx: number) => {
    if (userAnswers[questionIdx] !== undefined) return; // Answer already submitted
    setUserAnswers((prev) => ({ ...prev, [questionIdx]: optionIdx }));
  };

  const handleCheckGrammar = (idx: number) => {
    setGrammarChecked((prev) => ({ ...prev, [idx]: true }));
  };

  // Calculate Quiz Score
  const totalQuestions = lesson?.content?.comprehension_questions?.length || 0;
  const answeredQuestionsCount = Object.keys(userAnswers).length;
  const correctCount = Object.entries(userAnswers).filter(([qIdx, answerIdx]) => {
    const question = lesson?.content?.comprehension_questions[parseInt(qIdx, 10)];
    return question && question.correct_index === answerIdx;
  }).length;

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.centerBox}>
          <Loader2 size={40} className={styles.spinner} />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 500 }}>Loading Lesson Worksheet...</h2>
        </div>
      </div>
    );
  }

  if (errorMessage || !lesson) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.centerBox}>
          <AlertCircle size={44} color="var(--color-danger, #ef4444)" style={{ marginBottom: "16px" }} />
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "8px" }}>Lesson Not Found</h2>
          <p style={{ color: "var(--color-body, #9e988f)", marginBottom: "24px" }}>
            {errorMessage || "This lesson link may have expired or the lesson was deleted."}
          </p>
          <Link
            to="/videos"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              backgroundColor: "var(--color-primary, #0045e6)",
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            <ArrowLeft size={16} /> Explore Video Lessons
          </Link>
        </div>
      </div>
    );
  }

  const { content } = lesson;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        {/* Top Header Banner */}
        <div className={styles.headerBanner}>
          <div className={styles.headerTop}>
            <div className={styles.badgesRow}>
              <span className={styles.cefrBadge}>{lesson.target_level || content.level || "B1"}</span>
              <span className={styles.timeBadge}>
                <Clock size={14} />
                <span>{content.estimated_time_min || 45} mins</span>
              </span>
            </div>
            <div className={styles.actionButtons}>
              <button
                className={styles.printBtn}
                onClick={() => window.print()}
                title="Print or export as PDF worksheet"
              >
                <Printer size={15} />
                <span>Print Worksheet</span>
              </button>
            </div>
          </div>

          <h1 className={styles.title}>{content.title || lesson.title}</h1>
          {content.summary && <p className={styles.summary}>{content.summary}</p>}
        </div>

        {/* Video Player Embed (if YouTube video is attached) */}
        {lesson.youtube_id && (
          <div className={styles.videoWrapper}>
            <iframe
              ref={videoIframeRef}
              className={styles.iframeVideo}
              src={`https://www.youtube-nocookie.com/embed/${lesson.youtube_id}?enablejsapi=1&rel=0`}
              title={content.title || lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Navigation Step Pills */}
        <div className={styles.navPills}>
          <button
            className={`${styles.navPill} ${activeTab === "all" ? styles.navPillActive : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <span>All Worksheet</span>
          </button>
          <button
            className={`${styles.navPill} ${activeTab === "vocab" ? styles.navPillActive : ""}`}
            onClick={() => setActiveTab("vocab")}
          >
            <span className={styles.pillIndex}>1</span>
            <span>Vocabulary ({content.vocabulary?.length || 0})</span>
          </button>
          <button
            className={`${styles.navPill} ${activeTab === "quiz" ? styles.navPillActive : ""}`}
            onClick={() => setActiveTab("quiz")}
          >
            <span className={styles.pillIndex}>2</span>
            <span>Comprehension ({content.comprehension_questions?.length || 0})</span>
          </button>
          <button
            className={`${styles.navPill} ${activeTab === "grammar" ? styles.navPillActive : ""}`}
            onClick={() => setActiveTab("grammar")}
          >
            <span className={styles.pillIndex}>3</span>
            <span>Grammar Focus ({content.grammar_focus?.length || 0})</span>
          </button>
          <button
            className={`${styles.navPill} ${activeTab === "speaking" ? styles.navPillActive : ""}`}
            onClick={() => setActiveTab("speaking")}
          >
            <span className={styles.pillIndex}>4</span>
            <span>Discussion ({content.speaking_prompts?.length || 0})</span>
          </button>
        </div>

        {/* SECTION 1: VOCABULARY */}
        {(activeTab === "all" || activeTab === "vocab") && content.vocabulary?.length > 0 && (
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>
              <BookOpen size={20} color="#60a5fa" />
              <span>1. Target Vocabulary & Expressions</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Pre-watch key phrases from the video. Listen to native pronunciation and observe real contextual usage.
            </p>

            <div className={styles.vocabGrid}>
              {content.vocabulary.map((item, idx) => (
                <div key={idx} className={styles.vocabCard}>
                  <div>
                    <div className={styles.vocabTopRow}>
                      <h3 className={styles.vocabWord}>{item.word}</h3>
                      <button
                        className={styles.soundBtn}
                        onClick={() => playPronunciation(item.word)}
                        title="Listen to pronunciation"
                        aria-label={`Listen to ${item.word}`}
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <p className={styles.vocabDefinition}>{item.definition}</p>
                    {item.context && (
                      <p className={styles.vocabContextQuote}>"{item.context}"</p>
                    )}
                  </div>

                  <div className={styles.vocabFooter}>
                    {item.timestamp_sec > 0 && lesson.youtube_id ? (
                      <button
                        className={styles.timestampLink}
                        onClick={() => handleSeekVideo(item.timestamp_sec)}
                        title="Jump video to cue"
                      >
                        <Clock size={12} />
                        <span>
                          {Math.floor(item.timestamp_sec / 60)}:
                          {Math.floor(item.timestamp_sec % 60)
                            .toString()
                            .padStart(2, "0")}
                        </span>
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.72rem", color: "var(--color-mute)" }}>
                        {item.cefr || "B1"}
                      </span>
                    )}

                    <button
                      className={`${styles.saveWordBtn} ${savedWords[item.word.toLowerCase()] ? styles.saveWordBtnSaved : ""}`}
                      onClick={() => handleSaveWord(item.word, item.context, item.definition)}
                      title={savedWords[item.word.toLowerCase()] ? "Word saved to your SRS cards" : "Save to personal flashcards"}
                    >
                      {savedWords[item.word.toLowerCase()] ? (
                        <>
                          <BookmarkCheck size={14} color="var(--color-success)" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus size={14} />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: COMPREHENSION QUIZ */}
        {(activeTab === "all" || activeTab === "quiz") && content.comprehension_questions?.length > 0 && (
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>
              <HelpCircle size={20} color="#60a5fa" />
              <span>2. Comprehension Check</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Test your understanding of the dialogue and details. Select an option to check your answer immediately.
            </p>

            {content.comprehension_questions.map((q, idx) => {
              const selectedIdx = userAnswers[idx];
              const isAnswered = selectedIdx !== undefined;

              return (
                <div key={idx} className={styles.quizCard}>
                  <h3 className={styles.quizQuestionTitle}>
                    {idx + 1}. {q.question}
                  </h3>

                  <div className={styles.optionsContainer}>
                    {q.options.map((opt, optIdx) => {
                      let optionClass = styles.quizOptionItem;
                      if (isAnswered) {
                        optionClass += ` ${styles.optionDisabled}`;
                        if (optIdx === q.correct_index) {
                          optionClass += ` ${styles.quizOptionCorrect}`;
                        } else if (optIdx === selectedIdx) {
                          optionClass += ` ${styles.quizOptionIncorrect}`;
                        }
                      }

                      return (
                        <button
                          type="button"
                          key={optIdx}
                          className={optionClass}
                          onClick={() => handleSelectQuizAnswer(idx, optIdx)}
                          disabled={isAnswered}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontWeight: 600, width: "18px" }}>
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span>{opt}</span>
                          </div>

                          {isAnswered && optIdx === q.correct_index && (
                            <CheckCircle2 size={18} color="var(--color-success, #22c55e)" />
                          )}
                          {isAnswered && optIdx === selectedIdx && optIdx !== q.correct_index && (
                            <XCircle size={18} color="var(--color-danger, #ef4444)" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && q.explanation && (
                    <div className={styles.explanationBox}>
                      <strong>Explanation: </strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}

            {answeredQuestionsCount > 0 && (
              <div className={styles.scoreBanner}>
                <span className={styles.scoreText}>
                  Your Score: {correctCount} / {totalQuestions} (
                  {Math.round((correctCount / totalQuestions) * 100)}%)
                </span>
                {answeredQuestionsCount === totalQuestions && (
                  <span style={{ color: "var(--color-success)", fontSize: "0.85rem", fontWeight: 500 }}>
                    Quiz Completed!
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: GRAMMAR FOCUS */}
        {(activeTab === "all" || activeTab === "grammar") && content.grammar_focus?.length > 0 && (
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>
              <Sparkles size={20} color="#60a5fa" />
              <span>3. Grammar in Action</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Targeted linguistic structures captured from authentic native dialogue.
            </p>

            {content.grammar_focus.map((g, idx) => {
              const isChecked = grammarChecked[idx];
              const userInput = (grammarInputs[idx] || "").trim().toLowerCase();
              const expected = g.exercise_answer.trim().toLowerCase();
              const isMatch = userInput === expected;

              return (
                <div key={idx} className={styles.grammarBox}>
                  <h3 className={styles.grammarTitle}>{g.pattern}</h3>
                  <p className={styles.grammarRule}>{g.rule}</p>
                  {g.example_from_video && (
                    <p style={{ fontSize: "0.82rem", color: "var(--color-mute)", fontStyle: "italic", marginBottom: "14px" }}>
                      Example from video: "{g.example_from_video}"
                    </p>
                  )}

                  <div style={{ backgroundColor: "var(--color-surface, #141312)", border: "1px solid var(--color-hairline, #282522)", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 500, marginBottom: "8px" }}>
                      Practice Exercise:
                    </div>
                    <div style={{ fontSize: "0.92rem", color: "var(--color-ink)", marginBottom: "12px" }}>
                      {g.exercise_gap_fill}
                    </div>

                    <div className={styles.grammarInputGroup}>
                      <input
                        type="text"
                        className={styles.grammarInput}
                        placeholder="Type missing word(s)..."
                        value={grammarInputs[idx] || ""}
                        onChange={(e) =>
                          setGrammarInputs({ ...grammarInputs, [idx]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCheckGrammar(idx);
                        }}
                      />
                      <button
                        className={styles.grammarCheckBtn}
                        onClick={() => handleCheckGrammar(idx)}
                      >
                        Check
                      </button>

                      {isChecked && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                          {isMatch ? (
                            <span style={{ color: "var(--color-success, #22c55e)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <CheckCircle2 size={16} /> Correct!
                            </span>
                          ) : (
                            <span style={{ color: "var(--color-danger, #ef4444)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <XCircle size={16} /> Expected: <strong>{g.exercise_answer}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION 4: SPEAKING & DISCUSSION */}
        {(activeTab === "all" || activeTab === "speaking") && content.speaking_prompts?.length > 0 && (
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>
              <MessageSquare size={20} color="#60a5fa" />
              <span>4. Speaking & Reflection Prompts</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Practice speaking out loud or write down your thoughts for your next lesson.
            </p>

            {content.speaking_prompts.map((prompt, idx) => (
              <div key={idx} className={styles.speakingCard}>
                <h3 className={styles.speakingQuestion}>
                  {idx + 1}. {prompt}
                </h3>
                <textarea
                  className={styles.speakingNotesArea}
                  placeholder="Draft your thoughts or notes here for classroom conversation..."
                  value={speakingNotes[idx] || ""}
                  onChange={(e) =>
                    setSpeakingNotes({ ...speakingNotes, [idx]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* SECTION 5: HOMEWORK / SELF-STUDY IDEA */}
        {content.homework_idea && (
          <div className={styles.sectionBlock} style={{ borderStyle: "dashed" }}>
            <h2 className={styles.sectionTitle} style={{ fontSize: "1.1rem" }}>
              <GraduationCap size={18} color="var(--color-mute)" />
              <span>Self-Study & Practice Mission</span>
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--color-body, #9e988f)", margin: "8px 0 0 0", lineHeight: 1.5 }}>
              {content.homework_idea}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLessonPage;
