import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TicketCard from './TicketCard';

describe('TicketCard payment action', () => {
  it('offers payment continuation only to the requester', async () => {
    const onRefreshPayment = vi.fn();
    const ticket = {
      _id: 'ticket-one',
      requester: { _id: 'requester', username: 'requester', displayName: 'Requester' },
      title: 'Payment pending ticket',
      description: 'A paid ticket waiting for checkout.',
      createdAt: new Date().toISOString(),
      status: 'payment_pending',
      paymentStatus: 'authorization_required',
      visibility: 'public',
      bountyAmount: 199,
      estimatedMinutes: 30,
      tags: ['react'],
      techStack: ['javascript']
    };

    render(
      <MemoryRouter>
        <TicketCard
          ticket={ticket}
          currentUserId="requester"
          onRefreshPayment={onRefreshPayment}
        />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: /continue payment/i }));
    expect(onRefreshPayment).toHaveBeenCalledWith(ticket);
  });
});
