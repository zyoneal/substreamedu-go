import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import LanguageSelector from './LanguageSelector';

describe('LanguageSelector (Spring Dropdown)', () => {
  it('opens listbox on click, selects a language, and closes', () => {
    const onLanguageSelect = jest.fn();
    render(
      <IntlProvider locale="en" messages={{}}>
        <LanguageSelector
          currentLanguage="uk"
          onLanguageSelect={onLanguageSelect}
          detectedRegion="UA"
        />
      </IntlProvider>
    );

    const trigger = screen.getByRole('button', { name: /select language/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);

    fireEvent.click(options[0]);
    expect(onLanguageSelect).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
