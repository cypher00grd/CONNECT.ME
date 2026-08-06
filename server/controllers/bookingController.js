import Stripe from 'stripe';
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import ProcessedStripeEvent from '../models/ProcessedStripeEvent.js';
import { activateTicketAfterPayment } from '../services/ticketMatchingService.js';
import { syncTicketPaymentAuthorization } from '../services/ticketPaymentService.js';
import { finalizeIssuePayment } from '../services/issuePaymentService.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sameId = (left, right) => {
    if (!left || !right) return false;
    return (left._id || left).toString() === (right._id || right).toString();
};

// -----------------------------------------------------
// CREATE CHECKOUT SESSION
// -----------------------------------------------------
export const createCheckoutSession = async (req, res, next) => {
    try {
        const { roomId } = req.body;

        if (!isValidObjectId(roomId)) {
            return res.status(400).json({ success: false, message: 'Invalid room id' });
        }

        const room = await Room.findById(roomId)
            .populate('creator', 'username displayName');

        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        if (room.type !== 'live_event' || room.status !== 'scheduled') {
            return res.status(400).json({ success: false, message: 'This room is not available for booking' });
        }

        if (sameId(room.creator, req.user._id)) {
            return res.status(400).json({ success: false, message: 'Creators do not need to book their own event' });
        }

        if (!room.scheduledStartTime || room.scheduledStartTime <= new Date()) {
            return res.status(400).json({ success: false, message: 'Booking is closed for this event' });
        }

        if (!Number.isInteger(room.entryFee) || room.entryFee < 1) {
            return res.status(400).json({ success: false, message: 'This event has an invalid ticket price' });
        }

        // Check if a booking already exists for this exact user and room
        const existingBooking = await Booking.findOne({ user: req.user._id, room: roomId });
        if (existingBooking && existingBooking.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'You have already booked this event' });
        }

        // Create Stripe checkout session
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Live Event: ${room.title}`,
                            description: room.description || `Ticket for scheduled live event with ${room.creator.displayName}`,
                        },
                        unit_amount: room.entryFee * 100, // Stripe expects amount in lowest denomination (paise)
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${clientUrl}/?booking=success&room=${room._id}`,
            cancel_url: `${clientUrl}/profile/${room.creator.username}?booking=canceled`,
            client_reference_id: req.user._id.toString(),
            metadata: {
                userId: req.user._id.toString(),
                roomId: room._id.toString(),
            },
        }, {
            idempotencyKey: `booking-checkout:${room._id}:${req.user._id}`
        });

        // Save pending booking
        if (existingBooking) {
            existingBooking.stripeSessionId = session.id;
            existingBooking.paymentStatus = 'pending';
            await existingBooking.save();
        } else {
            await Booking.create({
                user: req.user._id,
                room: room._id,
                stripeSessionId: session.id,
                paymentStatus: 'pending'
            });
        }

        // Return the session URL so the frontend can redirect
        res.status(200).json({
            success: true,
            url: session.url
        });
    } catch (err) {
        console.error('Create Checkout Session Error:', err);
        res.status(500).json({ success: false, message: 'Failed to create payment session' });
    }
};

// -----------------------------------------------------
// STRIPE WEBHOOK
// -----------------------------------------------------
export const stripeWebhook = async (req, res, next) => {
    // Stripe requires the raw body to verify the signature. 
    // This assumes body-parser.raw is applied in server.js for this specific route.
    const sig = req.headers['stripe-signature'];
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    let eventLog = null;
    try {
        eventLog = await ProcessedStripeEvent.findOne({ eventId: event.id });
        if (eventLog?.status === 'processed') {
            return res.json({ received: true, duplicate: true });
        }

        if (!eventLog) {
            eventLog = await ProcessedStripeEvent.create({
                eventId: event.id,
                type: event.type,
                livemode: !!event.livemode,
                status: 'processing'
            });
        } else {
            eventLog.status = 'processing';
            eventLog.lastError = '';
            await eventLog.save();
        }
    } catch (err) {
        if (err.code === 11000) {
            return res.json({ received: true, duplicate: true });
        }

        console.error('Webhook event ledger failed:', err);
        return res.status(500).json({ received: false });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        try {
            if (session.metadata?.kind === 'ticket_bounty' && session.metadata?.ticketId) {
                const ticket = await Ticket.findById(session.metadata.ticketId);

                if (ticket) {
                    ticket.stripeCheckoutSessionId = session.id;
                    if (session.payment_intent) {
                        ticket.stripePaymentIntentId = typeof session.payment_intent === 'string'
                            ? session.payment_intent
                            : session.payment_intent?.id || '';
                    }
                    await ticket.save();

                    const sync = await syncTicketPaymentAuthorization(ticket);
                    if (sync.authorized) {
                        await activateTicketAfterPayment(req.app.get('io'), ticket._id);
                        console.log(`Ticket bounty for session ${session.id} marked as authorized.`);
                    } else {
                        console.warn(`Ticket bounty session ${session.id} completed without capturable authorization.`);
                    }
                }

                eventLog.status = 'processed';
                eventLog.processedAt = new Date();
                await eventLog.save();
                return res.json({ received: true });
            }

            if (session.metadata?.kind === 'issue_bounty' && session.metadata?.issueId) {
                await finalizeIssuePayment({
                    io: req.app.get('io'),
                    session
                });
                console.log(`Issue bounty for session ${session.id} marked as paid.`);
                eventLog.status = 'processed';
                eventLog.processedAt = new Date();
                await eventLog.save();
                return res.json({ received: true });
            }

            const booking = await Booking.findOne({ stripeSessionId: session.id });

            if (booking) {
                booking.paymentStatus = 'paid';
                booking.stripePaymentIntentId = session.payment_intent;
                await booking.save();
                console.log(`Booking for session ${session.id} marked as paid.`);
            }
        } catch (err) {
            console.error('Error updating booking on webhook:', err);
            if (eventLog) {
                eventLog.status = 'failed';
                eventLog.lastError = err.message || 'Webhook processing failed';
                await eventLog.save();
            }
            return res.status(500).json({ received: false });
        }
    }

    if (eventLog) {
        eventLog.status = 'processed';
        eventLog.processedAt = new Date();
        await eventLog.save();
    }

    res.json({ received: true });
};
