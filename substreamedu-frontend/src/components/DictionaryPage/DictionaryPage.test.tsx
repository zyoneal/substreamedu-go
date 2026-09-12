import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import DictionaryPage from './DictionaryPage';
import { DictionaryService } from '../../services/DictionaryService';
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

jest.mock('../../services/DictionaryService', () => ({
  DictionaryService: {
    fetchDictionaryResources: jest.fn(),
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
});
