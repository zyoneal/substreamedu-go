import { createContext, Dispatch, SetStateAction } from 'react';

interface LanguageContextType {
	learningLanguage: string;
	setLearningLanguage: Dispatch<SetStateAction<string>>;
	fluentLanguage: string;
	setFluentLanguage: Dispatch<SetStateAction<string>>;
	isPlayerActive?: boolean;
	setIsPlayerActive?: Dispatch<SetStateAction<boolean>>;
}

export const LanguageContext = createContext<LanguageContextType>({
	learningLanguage: '',
	setLearningLanguage: () => {},
	fluentLanguage: '',
	setFluentLanguage: () => {},
	isPlayerActive: false,
	setIsPlayerActive: () => {},
});