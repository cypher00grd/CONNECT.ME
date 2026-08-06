import { describe, expect, it } from 'vitest';
import { userCanViewTicket } from '../../services/ticketMatchingService.js';

const requester = { _id: 'requester', skills: ['react'] };
const helper = { _id: 'helper', skills: ['react'], isInstructor: true };

describe('ticket visibility', () => {
  it('always allows the requester to see their payment-pending ticket', () => {
    expect(userCanViewTicket({
      requester: 'requester',
      targetHelper: 'helper',
      bountyAmount: 100,
      paymentStatus: 'authorization_required',
      status: 'payment_pending',
      visibility: 'direct'
    }, requester)).toBe(true);
  });

  it('hides an unpaid direct ticket from its target helper', () => {
    expect(userCanViewTicket({
      requester: 'requester',
      targetHelper: 'helper',
      bountyAmount: 100,
      paymentStatus: 'authorization_required',
      status: 'payment_pending',
      visibility: 'direct'
    }, helper)).toBe(false);
  });

  it('reveals a direct ticket after server-side authorization', () => {
    expect(userCanViewTicket({
      requester: 'requester',
      targetHelper: 'helper',
      bountyAmount: 100,
      paymentStatus: 'authorized',
      status: 'direct_pending',
      visibility: 'direct'
    }, helper)).toBe(true);
  });
});
