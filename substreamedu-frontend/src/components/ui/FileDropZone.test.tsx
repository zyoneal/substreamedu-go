import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDropZone } from './FileDropZone';

describe('FileDropZone', () => {
  it('handles drag over, drop, and displays selected file chip', () => {
    const onFilesSelected = jest.fn();
    render(
      <FileDropZone
        accept=".epub,.txt"
        title="Drop your EPUB or TXT file"
        hint="Automatic chapters"
        selectedFileName="gatsby.epub"
        onFilesSelected={onFilesSelected}
      />
    );

    const zone = screen.getByRole('button');
    expect(zone).toHaveAttribute('data-dragging', 'false');
    expect(screen.getByText('gatsby.epub')).toBeInTheDocument();

    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute('data-dragging', 'true');

    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    fireEvent.drop(zone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(zone).toHaveAttribute('data-dragging', 'false');
    expect(onFilesSelected).toHaveBeenCalledTimes(1);
  });

  it('renders busy state and disables interaction when isBusy is true', () => {
    const onFilesSelected = jest.fn();
    render(
      <FileDropZone
        accept=".csv"
        title="Drop CSV"
        busyTitle="Importing..."
        isBusy
        onFilesSelected={onFilesSelected}
      />
    );

    expect(screen.getByText('Importing...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });
});
