import React, { useState } from 'react';
import { Layers, Zap } from 'lucide-react';
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
        <div className="w-full min-h-screen bg-[#0d0c0b] text-[#ede8e0] pt-6 pb-16">
            {/* Top Navigation Mode Tabs */}
            <div className="max-w-md mx-auto px-4 mb-4">
                <div className="flex items-center justify-center p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                    <button
                        onClick={() => setActiveTab('flashcards')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                            activeTab === 'flashcards'
                                ? 'bg-white/[0.1] text-[#ede8e0] shadow-sm border border-white/[0.1]'
                                : 'text-[#666360] hover:text-[#9e988f]'
                        }`}
                    >
                        <Layers size={16} />
                        <span>SRS Flashcards</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('active_practice')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                            activeTab === 'active_practice'
                                ? 'bg-white/[0.1] text-[#ede8e0] shadow-sm border border-white/[0.1]'
                                : 'text-[#666360] hover:text-[#9e988f]'
                        }`}
                    >
                        <Zap size={16} className={activeTab === 'active_practice' ? 'text-[#f0c674]' : ''} />
                        <span>Active Practice</span>
                    </button>
                </div>
            </div>

            {/* Content View */}
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