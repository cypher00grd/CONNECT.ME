import mongoose from 'mongoose';

const processedStripeEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      required: true
    },
    livemode: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['processing', 'processed', 'failed'],
      default: 'processing',
      index: true
    },
    lastError: {
      type: String,
      default: ''
    },
    processedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const ProcessedStripeEvent = mongoose.model('ProcessedStripeEvent', processedStripeEventSchema);

export default ProcessedStripeEvent;
