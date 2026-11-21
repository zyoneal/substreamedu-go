import React, { useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '../../ui/modal';
import { Input } from '../../ui/input';
import { FileDropZone } from '../../ui/FileDropZone';
import { DictionaryService } from '../../../services/DictionaryService';
import { parseImportText } from '../utils/importParser';
import styles from '../DictionaryPage.module.css';

export interface DictionaryImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => Promise<void> | void;
}

export const DictionaryImportModal: React.FC<DictionaryImportModalProps> = ({
    isOpen,
    onClose,
    onImportComplete,
}) => {
    const [resourceName, setResourceName] = useState('Imported Vocabulary');
    const [rawText, setRawText] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultSummary, setResultSummary] = useState<string | null>(null);

    const parsed = useMemo(() => parseImportText(rawText), [rawText]);

    if (!isOpen) return null;

    const handleFilesSelected = (files: FileList) => {
        const file = files[0];
        if (!file) return;
        setSelectedFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setRawText(reader.result);
                setError(null);
                setResultSummary(null);
            }
        };
        reader.readAsText(file);
    };

    const handleSubmit = async () => {
        if (parsed.items.length === 0 || isImporting) return;
        setIsImporting(true);
        setError(null);
        setResultSummary(null);
        try {
            const res = await DictionaryService.importDictionaryWords(
                resourceName.trim() || 'Imported Vocabulary',
                parsed.items
            );
            setResultSummary(`Imported ${res.importedCount} word(s), skipped ${res.skippedCount} duplicate(s).`);
            await onImportComplete();
            setRawText('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import words.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <Modal.Header
                title="Import Vocabulary (CSV / TXT)"
                icon={<Upload size={18} />}
                onClose={onClose}
            />
            <Modal.Body>
                <div className={styles.modalFieldGroup}>
                    <label htmlFor="import-collection-input" className={styles.modalLabel}>
                        Collection Name
                    </label>
                    <Input
                        id="import-collection-input"
                        value={resourceName}
                        onChange={(e) => setResourceName(e.target.value)}
                        className={styles.modalInput}
                        placeholder="Imported Vocabulary"
                    />
                </div>

                <div className={styles.modalFieldGroup}>
                    <label htmlFor="import-file-input" className={styles.modalLabel}>
                        Upload .csv / .txt file (optional)
                    </label>
                    <FileDropZone
                        inputId="import-file-input"
                        accept=".csv,.txt,.tsv"
                        compact
                        variant="light"
                        title="Drop .csv or .txt file here, or click to browse"
                        hint="Supports comma, tab, semicolon, or dash-separated lists"
                        selectedFileName={selectedFileName}
                        isBusy={isImporting}
                        onFilesSelected={handleFilesSelected}
                    />
                </div>

                <div className={styles.modalFieldGroup}>
                    <label htmlFor="import-text-area" className={styles.modalLabel}>
                        Or paste words (one per line, CSV, or &quot;word - meaning&quot;)
                    </label>
                    <textarea
                        id="import-text-area"
                        rows={6}
                        value={rawText}
                        onChange={(e) => {
                            setRawText(e.target.value);
                            setError(null);
                            setResultSummary(null);
                        }}
                        className={styles.importTextarea}
                        placeholder={'serendipity - fortunate discovery by chance\ncall it a day, stop working for today\nresilient'}
                    />
                </div>

                {parsed.items.length > 0 && (
                    <p className={styles.importPreviewMeta}>
                        Ready to import <strong>{parsed.items.length}</strong> word(s)
                        {parsed.truncatedCount > 0 ? ` (${parsed.truncatedCount} extra lines truncated at 200-item batch limit)` : ''}.
                    </p>
                )}

                {error && <p className={styles.importErrorText}>{error}</p>}
                {resultSummary && <p className={styles.importSuccessText}>{resultSummary}</p>}
            </Modal.Body>
            <Modal.Footer>
                <button type="button" onClick={onClose} className={styles.modalCancelBtn}>
                    Close
                </button>
                <button
                    type="button"
                    disabled={parsed.items.length === 0 || isImporting}
                    onClick={handleSubmit}
                    className={styles.modalSaveBtn}
                >
                    {isImporting ? 'Importing...' : `Import ${parsed.items.length || ''} Words`}
                </button>
            </Modal.Footer>
        </Modal>
    );
};
