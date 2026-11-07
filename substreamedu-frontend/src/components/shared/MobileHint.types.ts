export interface MobileHintStep {
    key: string;
    highlight?: boolean;
}

export interface MobileHintProps {
    isVisible: boolean;
    onClose: () => void;
    steps: MobileHintStep[];
    titleKey?: string;
    closeButtonKey?: string;
}

export const MOBILE_HINT_STEPS = {
    VIDEO_PLAYER: [
        { key: 'mobileHint.step1' },
        { key: 'mobileHint.step2.iphone', highlight: true },
        { key: 'mobileHint.step2.android', highlight: true }
    ] as MobileHintStep[],

    SONGS_AND_TEXT: [
        { key: 'mobileHint.step2.iphone', highlight: true },
        { key: 'mobileHint.step2.android', highlight: true }
    ] as MobileHintStep[]
};

export const DEFAULT_MOBILE_HINT_KEYS = {
    TITLE: 'mobileHint.title',
    CLOSE_BUTTON: 'mobileHint.gotIt'
} as const;