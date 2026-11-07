import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Sparkles,
  X,
  Share2,
  Printer,
  Save,
  Check,
  Loader2,
  Clock,
  BookOpen,
  HelpCircle,
  Layers,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import {
  LessonService,
  LessonPlan,
  LessonVocabularyItem,
  LessonQuestion,
} from "../../../services/LessonService";
import styles from "./LessonStudioModal.module.css";

interface LessonStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  mediaSource?: string;
  youtubeId?: string;
  subtitles?: Array<{ start: number; end: number; text: string }>;
  learningLanguage?: string;
  onSeekToTime?: (timeSec: number) => void;
}

type TabKey = "overview" | "vocabulary" | "quiz" | "grammar" | "speaking";

export const LessonStudioModal: React.FC<LessonStudioModalProps> = ({
  isOpen,
  onClose,
  videoTitle,
  mediaSource = "youtube",
  youtubeId = "",
  subtitles = [],
  learningLanguage = "en",
  onSeekToTime,
}) => {
  const [targetLevel, setTargetLevel] = useState<string>("B1");
  const [customFocus, setCustomFocus] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generatedPlan = await LessonService.generateLesson({
        title: videoTitle || "Video English Lesson",
        language: learningLanguage,
        target_level: targetLevel,
        media_source: mediaSource,
        youtube_id: youtubeId,
        subtitles: subtitles.slice(0, 70),
        custom_focus: customFocus.trim() || undefined,
      });
      setPlan(generatedPlan);
      setActiveTab("overview");
      setShareToken(null);
      showToast("Lesson plan generated successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to generate lesson");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLesson = async (): Promise<string | null> => {
    if (!plan) return null;
    setIsSaving(true);
    try {
      const saved = await LessonService.saveLesson({
        title: plan.title || videoTitle,
        target_level: targetLevel,
        media_source: mediaSource,
        youtube_id: youtubeId,
        content: plan,
      });
      setShareToken(saved.share_token);
      showToast("Lesson saved successfully!");
      return saved.share_token;
    } catch (err: any) {
      showToast(err.message || "Failed to save lesson");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    let token = shareToken;
    if (!token) {
      token = await handleSaveLesson();
    }
    if (token) {
      const shareUrl = `${window.location.origin}/lesson/${token}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Student lesson link copied to clipboard!");
      } catch {
        showToast(`Share URL: ${shareUrl}`);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Editing handlers for teacher customization
  const updateVocabularyItem = (index: number, key: keyof LessonVocabularyItem, val: any) => {
    if (!plan) return;
    const newVocab = [...plan.vocabulary];
    newVocab[index] = { ...newVocab[index], [key]: val };
    setPlan({ ...plan, vocabulary: newVocab });
  };

  const removeVocabularyItem = (index: number) => {
    if (!plan) return;
    setPlan({
      ...plan,
      vocabulary: plan.vocabulary.filter((_, i) => i !== index),
    });
  };

  const addVocabularyItem = () => {
    if (!plan) return;
    const newItem: LessonVocabularyItem = {
      word: "new phrase",
      definition: "definition or explanation",
      context: "Context sentence from video",
      timestamp_sec: 0,
      cefr: targetLevel,
    };
    setPlan({
      ...plan,
      vocabulary: [...plan.vocabulary, newItem],
    });
  };

  const updateQuestion = (index: number, key: keyof LessonQuestion, val: any) => {
    if (!plan) return;
    const newQuestions = [...plan.comprehension_questions];
    newQuestions[index] = { ...newQuestions[index], [key]: val };
    setPlan({ ...plan, comprehension_questions: newQuestions });
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.studioIcon}>
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className={styles.title}>Teacher Mode / Lesson Studio</h2>
              <p className={styles.subtitle}>
                Auto-build CELTA-standard interactive worksheets & quizzes from video subtitles
              </p>
            </div>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close Studio"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Generator Controls Bar */}
        <div className={styles.generatorBar}>
          <div className={styles.levelPicker}>
            <span className={styles.levelLabel}>CEFR Level:</span>
            {["A2", "B1", "B2", "C1"].map((lvl) => (
              <button
                key={lvl}
                className={`${styles.levelBtn} ${targetLevel === lvl ? styles.levelBtnActive : ""}`}
                onClick={() => setTargetLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: "220px" }}>
            <input
              type="text"
              className={styles.inputField}
              placeholder="Optional focus (e.g. travel phrasal verbs, formal tone)..."
              value={customFocus}
              onChange={(e) => setCustomFocus(e.target.value)}
            />
          </div>

          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                <span>Designing Lesson...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{plan ? "Regenerate Plan" : "Generate Lesson"}</span>
              </>
            )}
          </button>
        </div>

        {/* Tabs navigation if plan exists */}
        {plan && (
          <div className={styles.tabsBar}>
            <button
              className={`${styles.tabBtn} ${activeTab === "overview" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <BookOpen size={15} />
              <span>Overview</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "vocabulary" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("vocabulary")}
            >
              <Layers size={15} />
              <span>Vocabulary</span>
              <span className={styles.tabBadge}>{plan.vocabulary.length}</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "quiz" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("quiz")}
            >
              <HelpCircle size={15} />
              <span>Comprehension</span>
              <span className={styles.tabBadge}>
                {plan.comprehension_questions.length}
              </span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "grammar" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("grammar")}
            >
              <Sparkles size={15} />
              <span>Grammar</span>
              <span className={styles.tabBadge}>{plan.grammar_focus.length}</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "speaking" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("speaking")}
            >
              <MessageSquare size={15} />
              <span>Discussion</span>
              <span className={styles.tabBadge}>
                {plan.speaking_prompts.length}
              </span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className={styles.bodyArea}>
          {isGenerating ? (
            <div className={styles.loadingState}>
              <Loader2 size={36} className={styles.spinner} />
              <h3 className={styles.loadingTitle}>
                Crafting CEFR {targetLevel} Lesson Plan
              </h3>
              <p className={styles.loadingSub}>
                Scanning subtitle cues, selecting key vocabulary, and designing comprehension exercises...
              </p>
            </div>
          ) : !plan ? (
            <div className={styles.initialState}>
              <div className={styles.initialIcon}>
                <GraduationCap size={28} />
              </div>
              <h3 className={styles.initialTitle}>
                Turn Any Video into a Complete Lesson
              </h3>
              <p className={styles.initialDesc}>
                Select your target CEFR level and click "Generate Lesson" to create vocabulary lists with timestamps, comprehension questions, grammar gap-fills, and speaking prompts.
              </p>
              <button
                className={styles.generateBtn}
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <Sparkles size={16} />
                <span>Generate Interactive Lesson</span>
              </button>
            </div>
          ) : (
            <>
              {/* Tab 1: Overview */}
              {activeTab === "overview" && (
                <div>
                  <div className={styles.card}>
                    <div className={styles.fieldLabel}>Lesson Title</div>
                    <input
                      type="text"
                      className={styles.inputField}
                      value={plan.title}
                      onChange={(e) =>
                        setPlan({ ...plan, title: e.target.value })
                      }
                    />
                  </div>

                  <div className={styles.card}>
                    <div className={styles.fieldLabel}>
                      Lesson Summary & Learning Objectives
                    </div>
                    <textarea
                      className={styles.textareaField}
                      value={plan.summary}
                      onChange={(e) =>
                        setPlan({ ...plan, summary: e.target.value })
                      }
                    />
                  </div>

                  <div className={styles.card}>
                    <div className={styles.fieldLabel}>
                      Recommended Homework / Practical Task
                    </div>
                    <textarea
                      className={styles.textareaField}
                      value={plan.homework_idea}
                      onChange={(e) =>
                        setPlan({ ...plan, homework_idea: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Vocabulary */}
              {activeTab === "vocabulary" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <span className={styles.fieldLabel}>
                      Target Vocabulary ({plan.vocabulary.length})
                    </span>
                    <button
                      className={styles.printButton}
                      onClick={addVocabularyItem}
                      style={{ padding: "4px 10px", fontSize: "0.76rem" }}
                    >
                      <Plus size={14} /> Add Word
                    </button>
                  </div>

                  <div className={styles.vocabGrid}>
                    {plan.vocabulary.map((item, idx) => (
                      <div key={idx} className={styles.vocabCard}>
                        <div className={styles.vocabHeader}>
                          <input
                            type="text"
                            className={styles.inputField}
                            style={{
                              fontWeight: 600,
                              padding: "4px 8px",
                              width: "70%",
                            }}
                            value={item.word}
                            onChange={(e) =>
                              updateVocabularyItem(idx, "word", e.target.value)
                            }
                          />
                          <span className={styles.vocabCefr}>
                            {item.cefr || targetLevel}
                          </span>
                          <button
                            onClick={() => removeVocabularyItem(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--color-mute)",
                              cursor: "pointer",
                              padding: "2px",
                            }}
                            title="Remove word"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          type="text"
                          className={styles.inputField}
                          style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          placeholder="Definition..."
                          value={item.definition}
                          onChange={(e) =>
                            updateVocabularyItem(
                              idx,
                              "definition",
                              e.target.value
                            )
                          }
                        />
                        <textarea
                          className={styles.textareaField}
                          style={{
                            minHeight: "48px",
                            fontSize: "0.78rem",
                            padding: "6px 8px",
                          }}
                          placeholder="Context from video..."
                          value={item.context}
                          onChange={(e) =>
                            updateVocabularyItem(idx, "context", e.target.value)
                          }
                        />
                        {onSeekToTime && item.timestamp_sec > 0 && (
                          <button
                            className={styles.vocabTimeBtn}
                            onClick={() => onSeekToTime(item.timestamp_sec)}
                            title="Jump video to this timestamp"
                          >
                            <Clock size={12} />
                            <span>
                              {Math.floor(item.timestamp_sec / 60)}:
                              {Math.floor(item.timestamp_sec % 60)
                                .toString()
                                .padStart(2, "0")}
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Comprehension Questions */}
              {activeTab === "quiz" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <span className={styles.fieldLabel}>
                      Comprehension Questions ({plan.comprehension_questions.length})
                    </span>
                  </div>

                  {plan.comprehension_questions.map((q, idx) => (
                    <div key={idx} className={styles.quizCard}>
                      <div className={styles.cardHeader}>
                        <span className={styles.fieldLabel}>
                          Question {idx + 1} ({q.type})
                        </span>
                        <button
                          onClick={() => {
                            setPlan({
                              ...plan,
                              comprehension_questions: plan.comprehension_questions.filter(
                                (_, i) => i !== idx
                              ),
                            });
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-mute)",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        className={styles.inputField}
                        value={q.question}
                        onChange={(e) =>
                          updateQuestion(idx, "question", e.target.value)
                        }
                      />
                      <div className={styles.quizOptionsList} style={{ marginTop: "12px" }}>
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`${styles.quizOption} ${optIdx === q.correct_index ? styles.quizOptionCorrect : ""}`}
                            onClick={() => updateQuestion(idx, "correct_index", optIdx)}
                            style={{ cursor: "pointer" }}
                            title="Click to mark as correct answer"
                          >
                            <span style={{ fontWeight: 600, width: "20px" }}>
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span style={{ flex: 1 }}>{opt}</span>
                            {optIdx === q.correct_index && (
                              <Check size={16} color="var(--color-success)" />
                            )}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className={styles.quizExplanation}>
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Grammar Focus */}
              {activeTab === "grammar" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <span className={styles.fieldLabel}>
                      Grammar Focus ({plan.grammar_focus.length})
                    </span>
                  </div>

                  {plan.grammar_focus.map((g, idx) => (
                    <div key={idx} className={styles.grammarPointCard}>
                      <div className={styles.grammarPattern}>{g.pattern}</div>
                      <div className={styles.grammarRule}>{g.rule}</div>
                      {g.example_from_video && (
                        <div
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--color-mute)",
                            marginBottom: "12px",
                            fontStyle: "italic",
                          }}
                        >
                          Video example: "{g.example_from_video}"
                        </div>
                      )}
                      <div className={styles.grammarExerciseBox}>
                        <div className={styles.fieldLabel}>Practice Gap Fill:</div>
                        <div className={styles.grammarExerciseText}>
                          {g.exercise_gap_fill}
                        </div>
                        <div className={styles.grammarAnswerBadge}>
                          Correct Answer: {g.exercise_answer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 5: Speaking Prompts */}
              {activeTab === "speaking" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <span className={styles.fieldLabel}>
                      Speaking & Discussion Prompts ({plan.speaking_prompts.length})
                    </span>
                  </div>

                  {plan.speaking_prompts.map((prompt, idx) => (
                    <div key={idx} className={styles.speakingItem}>
                      <div className={styles.speakingNumber}>{idx + 1}</div>
                      <p className={styles.speakingText}>{prompt}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {plan && (
          <div className={styles.footer}>
            <div className={styles.shareSection}>
              <button
                className={styles.shareButton}
                onClick={handleShare}
                disabled={isSaving}
                title="Save & copy student link to clipboard"
              >
                <Share2 size={16} />
                <span>Share with Students</span>
              </button>
              <button
                className={styles.printButton}
                onClick={handlePrint}
                title="Print or export as PDF worksheet"
              >
                <Printer size={16} />
                <span>Print Worksheet</span>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {toastMessage && (
                <div className={styles.toastNotification}>
                  <Check size={14} />
                  <span>{toastMessage}</span>
                </div>
              )}
              <button
                className={styles.saveButton}
                onClick={handleSaveLesson}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 size={16} className={styles.spinner} />
                ) : (
                  <Save size={16} />
                )}
                <span>Save</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className={styles.toastFloating}>
            <Check size={16} color="var(--color-success)" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
