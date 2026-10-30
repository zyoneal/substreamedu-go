import React, { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';
import { Modal } from '../../ui/modal';
import { Input } from '../../ui/input';
import { DictionaryItem } from '../utils/dictionaryUtils';
import styles from '../DictionaryPage.module.css';

export interface DictionaryEditModalProps {
    word: DictionaryItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedWord: DictionaryItem) => void;
}

export const DictionaryEditModal: React.FC<DictionaryEditModalProps> = ({
    word,
    isOpen,
    onClose,
    onSave,
}) => {
    const [draftWord, setDraftWord] = useState<DictionaryItem | null>(word);

    useEffect(() => {
        setDraftWord(word);
    }, [word]);

    if (!draftWord || !isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <Modal.Header
                title={`Edit: ${draftWord.highlightedText}`}
                icon={<Edit size={18} />}
                onClose={onClose}
            />
            <Modal.Body>
                <div className={styles.modalFieldGroup}>
                    <label htmlFor="edit-word-input" className={styles.modalLabel}>
                        Translation
                    </label>
                    <Input
                        id="edit-word-input"
                        value={draftWord.translatedText || ''}
                        onChange={(e) => setDraftWord({ ...draftWord, translatedText: e.target.value })}
                        className={styles.modalInput}
                        placeholder="Enter translation..."
                    />
                </div>

                <div className={styles.modalFieldGroup}>
                    <label htmlFor="edit-translation-input" className={styles.modalLabel}>
                        Definition
                    </label>
                    <Input
                        id="edit-translation-input"
                        value={draftWord.definition || ''}
                        onChange={(e) => setDraftWord({ ...draftWord, definition: e.target.value })}
                        className={styles.modalInput}
                        placeholder="Enter English definition..."
                    />
                </div>

                <div className={styles.modalFieldGroup}>
                    <label htmlFor="edit-context-input" className={styles.modalLabel}>
                        Context Sentence
                    </label>
                    <Input
                        id="edit-context-input"
                        value={draftWord.context || ''}
                        onChange={(e) => setDraftWord({ ...draftWord, context: e.target.value })}
                        className={styles.modalInput}
                        placeholder="Enter context sentence..."
                    />
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button
                    type="button"
                    onClick={onClose}
                    className={styles.modalCancelBtn}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => onSave(draftWord)}
                    className={styles.modalSaveBtn}
                >
                    Save Changes
                </button>
            </Modal.Footer>
        </Modal>
    );
};
