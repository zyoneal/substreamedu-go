import { createContext, Dispatch, SetStateAction } from 'react';

interface LanguageContextType {
	learningLanguage: string;
	setLearningLanguage: Dispatch<SetStateAction<string>>;
	fluentLanguage: string;
	setFluentLanguage: Dispatch<SetStateAction<string>>;
}

export const LanguageContext = createContext<LanguageContextType>({
	learningLanguage: '',
	setLearningLanguage: () => {},
	fluentLanguage: '',
	setFluentLanguage: () => {},
});