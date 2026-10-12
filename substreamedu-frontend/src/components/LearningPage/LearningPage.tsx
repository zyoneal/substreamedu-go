import React, { useState } from 'react';
import Flashcards from './Flashcards';
import { ActivePractice } from './ActivePractice';
import { usePixzenTheme } from '../HomePage/pixzen/usePixzenTheme';

interface PracticeWord {
    word: string;
    translation?: string;
    definition?: string;
    context?: string;
}

const LearningPage: React.FC = () => {
    usePixzenTheme();
    const [activeTab, setActiveTab] = useState<'flashcards' | 'active_practice'>('flashcards');
    const [practiceWords, setPracticeWords] = useState<PracticeWord[]>([]);

    const handleStartActivePractice = (words: PracticeWord[]) => {
        setPracticeWords(words);
        setActiveTab('active_practice');
    };

    return (
        <div className="w-full min-h-screen bg-canvas text-ink pt-[60px] sm:pt-[76px] pb-8 sm:pb-16 relative">
            <div className="pixzenGrain" aria-hidden="true" />
            {activeTab === 'flashcards' ? (
                <Flashcards onStartActivePractice={handleStartActivePractice} />
            ) : (
                <ActivePractice
                    initialWords={practiceWords}
                    onBackToFlashcards={() => setActiveTab('flashcards')}
                />
            )}
        </div>
    );
};

export default LearningPage;