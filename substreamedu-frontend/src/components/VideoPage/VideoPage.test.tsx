import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import VideoPage from './VideoPage';
import { AuthContext } from '../../store/AuthContext';
import enMessages from '../../locales/en.json';

jest.mock('lucide-react/dist/esm/icons/youtube', () => () => <span data-testid="icon-youtube" />);
jest.mock('lucide-react/dist/esm/icons/upload', () => () => <span data-testid="icon-upload" />);
jest.mock('lucide-react/dist/esm/icons/cloud', () => () => <span data-testid="icon-cloud" />);
jest.mock('lucide-react/dist/esm/icons/trash-2', () => () => <span data-testid="icon-trash" />);
jest.mock('lucide-react/dist/esm/icons/play', () => () => <span data-testid="icon-play" />);

jest.mock('../../services/SubtitleService', () => ({
  SubtitleService: {
    fetchAllSubtitles: jest.fn().mockResolvedValue([]),
    uploadSubtitles: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../services/AuthService', () => ({
  AuthService: {
    getToken: jest.fn().mockReturnValue('test-token'),
    getUserEmail: jest.fn().mockReturnValue('test@example.com'),
  },
}));

jest.mock('../../services/AnalyticsService', () => ({
  AnalyticsService: {
    trackEvent: jest.fn(),
    trackOpenPlayer: jest.fn(),
  },
}));

jest.mock('../HomePage/pixzen/usePixzenTheme', () => ({
  usePixzenTheme: jest.fn(),
}));

jest.mock('./VideoPlayer', () => ({
  __esModule: true,
  default: ({ videoUrl, onSelectAnotherVideo }: { videoUrl: string; onSelectAnotherVideo?: () => void }) => (
    <div data-testid="mock-video-player" data-video-url={videoUrl}>
      <button type="button" onClick={onSelectAnotherVideo}>
        Replace
      </button>
    </div>
  ),
}));

jest.mock('./components/YouTubeUrlInput', () => ({
  YouTubeUrlInput: () => <div data-testid="youtube-url-input" />,
}));

jest.mock('./components/VideoUpload', () => ({
  VideoUpload: () => <div data-testid="video-upload" />,
}));

jest.mock('./components/GoogleDriveButton', () => ({
  GoogleDriveButton: () => <div data-testid="google-drive-button" />,
}));

jest.mock('./components/RecommendedChannels', () => ({
  RecommendedChannels: () => <div data-testid="recommended-channels" />,
}));

jest.mock('./components/QuickStartVideoPicks', () => ({
  CURATED_DEMO_VIDEOS: [],
  QuickStartVideoPicks: () => <div data-testid="quick-start-picks" />,
}));

const renderVideoPage = (initialEntry: string) => {
  const url = new URL(`https://substreamedu.com${initialEntry}`);
  Object.defineProperty(window, 'location', {
    writable: true,
    value: url,
  });

  return render(
    <AuthContext.Provider
      value={{
        isLoggedIn: true,
        setIsLoggedIn: jest.fn(),
        authorities: [],
        setAuthorities: jest.fn(),
      }}
    >
      <IntlProvider locale="en" messages={enMessages}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <VideoPage />
        </MemoryRouter>
      </IntlProvider>
    </AuthContext.Provider>
  );
};

describe('VideoPage Replace button from Resume Watching', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    window.scrollTo = jest.fn();
  });

  it('stays on the video selection screen after clicking Replace when opened with ?videoUrl=...&t=...', () => {
    const videoUrl = 'https://www.youtube.com/watch?v=hsUkTQ1YTOQ';
    renderVideoPage(`/videos?videoUrl=${encodeURIComponent(videoUrl)}&t=42`);

    const player = screen.getByTestId('mock-video-player');
    expect(player).toHaveAttribute('data-video-url', videoUrl);

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.queryByTestId('mock-video-player')).not.toBeInTheDocument();
    expect(screen.getByTestId('youtube-url-input')).toBeInTheDocument();
  });

  it('stays on the video selection screen after clicking Replace on a demo route', () => {
    renderVideoPage('/youtube-demo');

    expect(screen.getByTestId('mock-video-player')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.queryByTestId('mock-video-player')).not.toBeInTheDocument();
    expect(screen.getByTestId('youtube-url-input')).toBeInTheDocument();
  });
});
