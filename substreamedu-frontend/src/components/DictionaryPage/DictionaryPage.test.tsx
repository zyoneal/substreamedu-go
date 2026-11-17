import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import DictionaryPage from './DictionaryPage';
import { DictionaryService } from '../../services/DictionaryService';
import { AuthService } from '../../services/AuthService';
import enMessages from '../../locales/en.json';

// Mock ESM icon modules from lucide-react to prevent Jest CommonJS parsing errors
jest.mock('lucide-react/dist/esm/icons/download', () => () => <span data-testid="icon-download" />);
jest.mock('lucide-react/dist/esm/icons/search', () => () => <span data-testid="icon-search" />);
jest.mock('lucide-react/dist/esm/icons/trash-2', () => () => <span data-testid="icon-trash" />);
jest.mock('lucide-react/dist/esm/icons/book-open', () => () => <span data-testid="icon-book-open" />);
jest.mock('lucide-react/dist/esm/icons/grid-3x3', () => () => <span data-testid="icon-grid" />);
jest.mock('lucide-react/dist/esm/icons/list', () => () => <span data-testid="icon-list" />);
jest.mock('lucide-react/dist/esm/icons/chevron-left', () => () => <span data-testid="icon-chevron-left" />);
jest.mock('lucide-react/dist/esm/icons/chevron-right', () => () => <span data-testid="icon-chevron-right" />);
jest.mock('lucide-react/dist/esm/icons/play', () => () => <span data-testid="icon-play" />);
jest.mock('lucide-react/dist/esm/icons/film', () => () => <span data-testid="icon-film" />);
jest.mock('lucide-react/dist/esm/icons/music', () => () => <span data-testid="icon-music" />);
jest.mock('lucide-react/dist/esm/icons/folder', () => () => <span data-testid="icon-folder" />);
jest.mock('lucide-react/dist/esm/icons/type', () => () => <span data-testid="icon-type" />);
jest.mock('lucide-react/dist/esm/icons/edit', () => () => <span data-testid="icon-edit" />);
jest.mock('lucide-react/dist/esm/icons/sparkles', () => () => <span data-testid="icon-sparkles" />);
jest.mock('lucide-react/dist/esm/icons/volume-2', () => () => <span data-testid="icon-volume" />);
jest.mock('lucide-react/dist/esm/icons/layers', () => () => <span data-testid="icon-layers" />);
jest.mock('lucide-react/dist/esm/icons/network', () => () => <span data-testid="icon-network" />);
jest.mock('lucide-react/dist/esm/icons/x', () => () => <span data-testid="icon-x" />);
jest.mock('lucide-react/dist/esm/icons/arrow-left', () => () => <span data-testid="icon-arrow-left" />);
jest.mock('lucide-react/dist/esm/icons/refresh-cw', () => () => <span data-testid="icon-refresh-cw" />);
jest.mock('lucide-react/dist/esm/icons/tag', () => () => <span data-testid="icon-tag" />);
jest.mock('lucide-react/dist/esm/icons/check-circle-2', () => () => <span data-testid="icon-check-circle" />);

jest.mock('../../services/DictionaryService', () => ({
  DictionaryService: {
    fetchDictionaryResources: jest.fn(),
    fetchDictionaryCategories: jest.fn(),
    fetchDictionaryItemsByCategory: jest.fn(),
    categorizeUserVocabulary: jest.fn(),
    fetchDictionaryItemsByUser: jest.fn(),
    deleteDictionaryResource: jest.fn(),
    deleteDictionaryItem: jest.fn(),
    exportAllDictionaryAsAnki: jest.fn(),
  },
}));

describe('DictionaryPage Empty State (0 words)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <IntlProvider locale="en" messages={enMessages}>
        <MemoryRouter>
          <DictionaryPage />
        </MemoryRouter>
      </IntlProvider>
    );
  };

  it('renders empty state properly without crashing when backend returns empty list', async () => {
    (DictionaryService.fetchDictionaryResources as jest.Mock).mockResolvedValue([]);
    (DictionaryService.fetchDictionaryItemsByUser as jest.Mock).mockResolvedValue([]);

    renderComponent();

    // Verify stats show 0
    expect(screen.getByText('Total Vocabulary Words')).toBeInTheDocument();

    // Verify empty state UI is rendered after loading completes
    const emptyHeading = await screen.findByText(/Word lists not found|No collections yet/i);
    expect(emptyHeading).toBeInTheDocument();
    expect(screen.getByText(/Save new words while watching videos/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore videos/i })).toBeInTheDocument();
  });

  it('handles null/undefined backend response gracefully without throwing', async () => {
    (DictionaryService.fetchDictionaryResources as jest.Mock).mockResolvedValue(null);
    (DictionaryService.fetchDictionaryItemsByUser as jest.Mock).mockResolvedValue(null);

    renderComponent();

    // Should NOT crash, stats bar and empty state must render
    expect(screen.getByText('Total Vocabulary Words')).toBeInTheDocument();

    const emptyHeading = await screen.findByText(/Word lists not found|No collections yet/i);
    expect(emptyHeading).toBeInTheDocument();
  });

  it('renders Apple-minimalist collection cards without bracketed technical tags or noisy badges', async () => {
    jest.spyOn(AuthService, 'getUserEmail').mockReturnValue('test@example.com');
    (DictionaryService.fetchDictionaryResources as jest.Mock).mockResolvedValue([
      {
        groupName: 'Inception.srt',
        numberOfWords: 14,
        sampleWords: ['subconscious', 'paradox', 'totem'],
      },
    ]);

    renderComponent();

    const collectionTitle = await screen.findByText('Inception.srt');
    expect(collectionTitle).toBeInTheDocument();
    expect(screen.getByText('14 words')).toBeInTheDocument();
    expect(screen.getByText('subconscious')).toBeInTheDocument();

    // Ensure bracketed technical tags and noisy pill badges are not rendered
    expect(screen.queryByText('[MOVIES]')).not.toBeInTheDocument();
    expect(screen.queryByText('[YOUTUBE]')).not.toBeInTheDocument();
    expect(screen.queryByText('SAVED')).not.toBeInTheDocument();
    expect(screen.queryByText('SOURCES')).not.toBeInTheDocument();
    expect(screen.queryByText('Vocabulary Preview')).not.toBeInTheDocument();
  });

  it('renders telemetry Bento cards and source category filter toolbar with matching CSS module classes', async () => {
    (DictionaryService.fetchDictionaryResources as jest.Mock).mockResolvedValue([]);
    (DictionaryService.fetchDictionaryItemsByUser as jest.Mock).mockResolvedValue([]);

    const { container } = renderComponent();

    expect(screen.getByText('words saved')).toBeInTheDocument();
    expect(screen.getByText('0% retention')).toBeInTheDocument();
    expect(screen.getByText('media sources')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: /source category filter/i })).toBeInTheDocument();
    expect(container.querySelector('.statsGrid')).toBeInTheDocument();
    expect(container.querySelector('.controlsContainer')).toBeInTheDocument();
    expect(container.querySelector('.mainContentArea')).toBeInTheDocument();
  });

  it('hides Categorize Vocabulary button and shows up-to-date completion status when categorization finishes', async () => {
    jest.spyOn(AuthService, 'getUserEmail').mockReturnValue('test@example.com');
    (DictionaryService.fetchDictionaryResources as jest.Mock).mockResolvedValue([]);
    (DictionaryService.fetchDictionaryCategories as jest.Mock).mockResolvedValue([
      { categoryName: 'Daily Life', numberOfWords: 12 },
    ]);
    (DictionaryService.categorizeUserVocabulary as jest.Mock).mockResolvedValue({
      categorized: 12,
      remaining: 0,
      total: 12,
    });

    renderComponent();

    const viewModeTabs = screen.getByRole('tablist', { name: 'View mode' });
    const themesTab = within(viewModeTabs).getByRole('tab', { name: /themes|categories/i });
    fireEvent.click(themesTab);

    const categorizeBtn = await screen.findByRole('button', { name: /categorize vocabulary/i });
    fireEvent.click(categorizeBtn);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/up to date/i);
    });

    expect(screen.queryByRole('button', { name: /categorize/i })).not.toBeInTheDocument();
    expect(screen.getByText(/all 12 words categorized/i)).toBeInTheDocument();
  });
});
