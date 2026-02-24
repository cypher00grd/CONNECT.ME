import Stripe from 'stripe';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';

// -----------------------------------------------------
// CREATE CHECKOUT SESSION
// -----------------------------------------------------
export const createCheckoutSession = async (req, res, next) => {
    try {
        const { roomId } = req.body;

        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        if (room.type !== 'live_event' || room.status !== 'scheduled') {
            return res.status(400).json({ success: false, message: 'This room is not available for booking' });
        }

        // Check if a booking already exists for this exact user and room
        const existingBooking = await Booking.findOne({ user: req.user._id, room: roomId });
        if (existingBooking && existingBooking.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'You have already booked this event' });
        }

        // Create Stripe checkout session
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Live Event: ${room.title}`,
                            description: room.description || `Ticket for scheduled live event with ${room.creator.toString()}`,
                        },
                        unit_amount: room.entryFee * 100, // Stripe expects amount in lowest denomination (paise)
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/?booking=success&room=${room._id}`,
            cancel_url: `${process.env.CLIENT_URL}/profile/${room.creator}?booking=canceled`,
            client_reference_id: req.user._id.toString(),
            metadata: {
                userId: req.user._id.toString(),
                roomId: room._id.toString(),
            },
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

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        try {
            const booking = await Booking.findOne({ stripeSessionId: session.id });

            if (booking) {
                booking.paymentStatus = 'paid';
                booking.stripePaymentIntentId = session.payment_intent;
                await booking.save();
                console.log(`Booking for session ${session.id} marked as paid.`);
            }
        } catch (err) {
            console.error('Error updating booking on webhook:', err);
        }
    }

    res.json({ received: true });
};
