import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        },
        stripeSessionId: {
            type: String,
            required: true,
            unique: true
        },
        stripePaymentIntentId: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

// Indexes
bookingSchema.index({ room: 1, user: 1 }, { unique: true });
bookingSchema.index({ user: 1, paymentStatus: 1 });
bookingSchema.index({ room: 1, paymentStatus: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
