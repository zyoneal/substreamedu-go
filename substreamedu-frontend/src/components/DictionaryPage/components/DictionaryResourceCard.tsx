import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import {
    DictionaryResource,
    getSourceType,
    getSourceIcon,
} from '../utils/dictionaryUtils';
import styles from '../DictionaryPage.module.css';

export interface DictionaryResourceCardProps {
    resource: DictionaryResource;
    index: number;
    layout: 'grid' | 'list';
    onDelete: (groupName: string) => void;
}

export const DictionaryResourceCard: React.FC<DictionaryResourceCardProps> = ({
    resource,
    index,
    layout,
    onDelete,
}) => {
    const sourceType = getSourceType(resource.groupName || '');
    const SourceIcon = getSourceIcon(sourceType);

    if (layout === 'list') {
        return (
            <div
                key={resource.groupName || `list-item-${index}`}
                className={styles.groupListItem}
            >
                <Link
                    to={`/dictionary/resources/${resource.groupName || 'unknown'}`}
                    className={styles.groupListItemLink}
                >
                    <div className={styles.listItemLeft}>
                        <div className={styles.sourceIconBoxSmall}>
                            <SourceIcon size={15} />
                        </div>
                        <h3 className={styles.listItemTitle}>
                            {resource.groupName || 'Untitled Group'}
                        </h3>
                    </div>

                    <div className={styles.listItemRight}>
                        <span className={styles.groupWordCountPill}>
                            {resource.numberOfWords} {resource.numberOfWords === 1 ? 'word' : 'words'}
                        </span>
                        <button
                            className={styles.actionIconBtn}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(resource.groupName || '');
                            }}
                            title="Delete collection"
                            aria-label="Delete collection"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </Link>
            </div>
        );
    }

    return (
        <div
            key={resource.groupName || `resource-${index}`}
            className={styles.groupCard}
        >
            <button
                className={styles.deleteGroupBtn}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(resource.groupName || '');
                }}
                title="Delete collection"
                aria-label="Delete collection"
            >
                <Trash2 size={14} />
            </button>

            <Link
                to={`/dictionary/resources/${resource.groupName || 'unknown'}`}
                className={styles.groupCardLink}
            >
                <div className={styles.groupCardHeader}>
                    <div className={styles.groupHeaderLeft}>
                        <div className={styles.sourceIconBox}>
                            <SourceIcon size={18} />
                        </div>
                        <h3 className={styles.groupTitle}>
                            {resource.groupName || 'Untitled Group'}
                        </h3>
                    </div>
                    <span className={styles.groupWordCountPill}>
                        {resource.numberOfWords} {resource.numberOfWords === 1 ? 'word' : 'words'}
                    </span>
                </div>

                {resource.sampleWords && resource.sampleWords.length > 0 && (
                    <div className={styles.sampleWordsBox}>
                        <div className={styles.sampleWordsChips}>
                            {resource.sampleWords.slice(0, 4).map((word, idx) => (
                                <span key={idx} className={styles.wordChip}>
                                    {word}
                                </span>
                            ))}
                            {resource.sampleWords.length > 4 && (
                                <span className={styles.moreWordsChip}>
                                    +{resource.sampleWords.length - 4}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </Link>
        </div>
    );
};
