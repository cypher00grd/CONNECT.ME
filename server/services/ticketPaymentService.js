import Stripe from 'stripe';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const getStripeId = (value) => {
  if (!value) return '';
  return typeof value === 'string' ? value : value.id || '';
};

const isIntentAuthorized = (intent) => (
  intent?.status === 'requires_capture' || Number(intent?.amount_capturable || 0) > 0
);

const getCheckoutSessionWithIntent = async (stripe, sessionId) => {
  if (!sessionId) return { session: null, paymentIntent: null };

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent']
  });
  const paymentIntent = typeof session.payment_intent === 'string'
    ? await stripe.paymentIntents.retrieve(session.payment_intent)
    : session.payment_intent || null;

  return { session, paymentIntent };
};

export const createTicketCheckoutSession = async ({ ticket, requester, checkoutAttempt = 'initial' }) => {
  const stripe = getStripe();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const amount = Math.round(Number(ticket.bountyAmount || 0) * 100);

  if (amount < 100) {
    throw new Error('Bounty amount must be at least ₹1');
  }

  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'inr',
          product_data: {
            name: `Help Ticket: ${ticket.title}`,
            description: ticket.description?.slice(0, 250) || 'On-demand help ticket bounty'
          },
          unit_amount: amount
        },
        quantity: 1
      }
    ],
    payment_intent_data: {
      capture_method: 'manual',
      metadata: {
        kind: 'ticket_bounty',
        ticketId: ticket._id.toString(),
        requesterId: requester._id.toString()
      }
    },
    success_url: `${clientUrl}/?ticket_payment=success&ticket=${ticket._id}`,
    cancel_url: `${clientUrl}/?ticket_payment=cancelled&ticket=${ticket._id}`,
    client_reference_id: requester._id.toString(),
    metadata: {
      kind: 'ticket_bounty',
      ticketId: ticket._id.toString(),
      requesterId: requester._id.toString()
    }
  }, {
    idempotencyKey: `ticket-checkout:${ticket._id}:${requester._id}:${checkoutAttempt}`
  });
};

export const captureTicketPayment = async (ticket) => {
  if (!ticket?.stripePaymentIntentId || ticket.paymentStatus !== 'authorized') {
    return null;
  }

  return getStripe().paymentIntents.capture(
    ticket.stripePaymentIntentId,
    {},
    { idempotencyKey: `ticket-capture:${ticket._id}:${ticket.stripePaymentIntentId}` }
  );
};

export const releaseTicketPayment = async (ticket) => {
  if (!ticket || ticket.bountyAmount <= 0) {
    return null;
  }

  const stripe = getStripe();
  let paymentIntent = null;

  if (ticket.stripePaymentIntentId) {
    paymentIntent = await stripe.paymentIntents.retrieve(ticket.stripePaymentIntentId);
  } else if (ticket.stripeCheckoutSessionId) {
    const checkout = await getCheckoutSessionWithIntent(stripe, ticket.stripeCheckoutSessionId);
    paymentIntent = checkout.paymentIntent;
  }

  if (paymentIntent?.status === 'requires_capture') {
    const cancelledIntent = await stripe.paymentIntents.cancel(paymentIntent.id);
    return {
      status: 'released',
      action: 'payment_intent_cancelled',
      paymentIntent: cancelledIntent
    };
  }

  if (paymentIntent?.status === 'succeeded') {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent.id,
      reason: 'requested_by_customer',
      metadata: {
        kind: 'ticket_bounty_refund',
        ticketId: ticket._id.toString()
      }
    }, {
      idempotencyKey: `ticket-refund:${ticket._id}:${paymentIntent.id}`
    });

    return {
      status: 'refunded',
      action: 'refund_created',
      refund
    };
  }

  if (paymentIntent?.status === 'canceled') {
    return {
      status: 'released',
      action: 'payment_intent_already_cancelled',
      paymentIntent
    };
  }

  if (ticket.stripeCheckoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(ticket.stripeCheckoutSessionId);
    if (session.status === 'open') {
      const expiredSession = await stripe.checkout.sessions.expire(ticket.stripeCheckoutSessionId);
      return {
        status: 'released',
        action: 'checkout_session_expired',
        session: expiredSession
      };
    }
  }

  return {
    status: ticket.paymentStatus === 'captured' ? 'captured' : 'released',
    action: 'nothing_to_release',
    paymentIntent
  };
};

export const syncTicketPaymentAuthorization = async (ticket) => {
  if (!ticket?.stripeCheckoutSessionId) {
    return {
      authorized: false,
      sessionStatus: null,
      paymentIntentStatus: null,
      sessionUrl: null
    };
  }

  const stripe = getStripe();
  const { session, paymentIntent } = await getCheckoutSessionWithIntent(
    stripe,
    ticket.stripeCheckoutSessionId
  );
  const paymentIntentId = getStripeId(paymentIntent || session?.payment_intent);

  if (paymentIntentId && ticket.stripePaymentIntentId !== paymentIntentId) {
    ticket.stripePaymentIntentId = paymentIntentId;
  }

  if (isIntentAuthorized(paymentIntent)) {
    ticket.paymentStatus = 'authorized';
    ticket.paymentAuthorizedAt = ticket.paymentAuthorizedAt || new Date();
    await ticket.save();

    return {
      authorized: true,
      sessionStatus: session?.status || null,
      paymentIntentStatus: paymentIntent.status,
      sessionUrl: session?.url || null,
      paymentIntent
    };
  }

  if (paymentIntent?.status === 'succeeded') {
    ticket.paymentStatus = 'captured';
    ticket.paymentCapturedAt = ticket.paymentCapturedAt || new Date();
    await ticket.save();

    return {
      authorized: true,
      captured: true,
      sessionStatus: session?.status || null,
      paymentIntentStatus: paymentIntent.status,
      sessionUrl: session?.url || null,
      paymentIntent
    };
  } else if (paymentIntent?.status === 'canceled' || session?.status === 'expired') {
    ticket.paymentStatus = 'released';
    ticket.paymentReleasedAt = ticket.paymentReleasedAt || new Date();
    await ticket.save();
  }

  return {
    authorized: false,
    sessionStatus: session?.status || null,
    paymentIntentStatus: paymentIntent?.status || null,
    sessionUrl: session?.url || null,
    paymentIntent
  };
};
