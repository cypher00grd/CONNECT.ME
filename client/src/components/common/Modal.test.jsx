import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

describe('Modal', () => {
  it('renders through a portal with dark-mode styling and accessible semantics', async () => {
    document.documentElement.classList.add('dark');
    const onClose = vi.fn();
    render(
      <div data-testid="component-root">
        <Modal isOpen onClose={onClose} title="Edit Profile">
          <button type="button">Save</button>
        </Modal>
      </div>
    );

    const dialog = screen.getByRole('dialog', { name: 'Edit Profile' });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(dialog).toHaveClass('dark:bg-dark-900');
    expect(document.body.style.overflow).toBe('hidden');
    await waitFor(() => expect(document.activeElement).toBe(dialog));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not render or lock scrolling while closed', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Closed">Body</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
