import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ConfirmModal } from './modal';

jest.mock('lucide-react/dist/esm/icons/x', () => (props: any) => <span data-testid="icon-x" {...props} />);

describe('Modal Component', () => {
    it('returns null when isOpen is false', () => {
        render(
            <Modal isOpen={false} onClose={jest.fn()}>
                <div>Modal Content</div>
            </Modal>
        );
        expect(screen.queryByText('Modal Content')).toBeNull();
    });

    it('renders dialog and content via portal when isOpen is true', () => {
        render(
            <Modal isOpen={true} onClose={jest.fn()} ariaLabel="Test Dialog">
                <div>Modal Content</div>
            </Modal>
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-label', 'Test Dialog');
        expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('locks body overflow to hidden on open and restores on unmount', () => {
        const originalOverflow = document.body.style.overflow;

        const { unmount } = render(
            <Modal isOpen={true} onClose={jest.fn()}>
                <div>Content</div>
            </Modal>
        );

        expect(document.body.style.overflow).toBe('hidden');
        unmount();
        expect(document.body.style.overflow).toBe(originalOverflow);
    });

    it('calls onClose when backdrop is clicked', () => {
        const onClose = jest.fn();
        render(
            <Modal isOpen={true} onClose={onClose}>
                <div>Content</div>
            </Modal>
        );

        const backdrop = screen.getByTestId('modal-backdrop');
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal container is clicked', () => {
        const onClose = jest.fn();
        render(
            <Modal isOpen={true} onClose={onClose}>
                <div>Content</div>
            </Modal>
        );

        const container = screen.getByTestId('modal-container');
        fireEvent.click(container);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
        const onClose = jest.fn();
        render(
            <Modal isOpen={true} onClose={onClose}>
                <div>Content</div>
            </Modal>
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on Escape when closeOnEscape is false', () => {
        const onClose = jest.fn();
        render(
            <Modal isOpen={true} onClose={onClose} closeOnEscape={false}>
                <div>Content</div>
            </Modal>
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });

    it('renders Modal.Header, Modal.Body, Modal.Footer compound structure', () => {
        const onClose = jest.fn();
        render(
            <Modal isOpen={true} onClose={onClose}>
                <Modal.Header
                    title="Modal Title"
                    subtitle="Modal Subtitle"
                    icon={<span data-testid="custom-icon">Icon</span>}
                    onClose={onClose}
                />
                <Modal.Body>
                    <p>Body Paragraph</p>
                </Modal.Body>
                <Modal.Footer>
                    <button type="button">Action</button>
                </Modal.Footer>
            </Modal>
        );

        expect(screen.getByTestId('modal-title')).toHaveTextContent('Modal Title');
        expect(screen.getByText('Modal Subtitle')).toBeInTheDocument();
        expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
        expect(screen.getByText('Body Paragraph')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();

        const closeButton = screen.getByTestId('modal-close-button');
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('ConfirmModal Component', () => {
    it('renders title, message, and action buttons', () => {
        const onClose = jest.fn();
        const onConfirm = jest.fn();

        render(
            <ConfirmModal
                isOpen={true}
                onClose={onClose}
                onConfirm={onConfirm}
                title="Delete Item"
                message="Are you sure you want to proceed?"
                confirmText="Yes, Delete"
                cancelText="No, Keep"
                variant="danger"
            />
        );

        expect(screen.getByText('Delete Item')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();

        const cancelBtn = screen.getByRole('button', { name: 'No, Keep' });
        const confirmBtn = screen.getByRole('button', { name: 'Yes, Delete' });

        fireEvent.click(cancelBtn);
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.click(confirmBtn);
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
