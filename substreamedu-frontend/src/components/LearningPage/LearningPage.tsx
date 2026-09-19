import React, { useState } from 'react';
import Flashcards from './Flashcards';
import { ActivePractice } from './ActivePractice';

interface PracticeWord {
    word: string;
    translation?: string;
    definition?: string;
    context?: string;
}

const LearningPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'flashcards' | 'active_practice'>('flashcards');
    const [practiceWords, setPracticeWords] = useState<PracticeWord[]>([]);

    const handleStartActivePractice = (words: PracticeWord[]) => {
        setPracticeWords(words);
        setActiveTab('active_practice');
    };

    return (
        <div className="w-full min-h-screen bg-[#0d0c0b] text-[#ede8e0] pt-[60px] sm:pt-[76px] pb-8 sm:pb-16">
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