import mongoose from 'mongoose';

const ticketReviewSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['requester_to_helper', 'helper_to_requester'],
      required: true
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    issueFixed: {
      type: Boolean,
      default: false
    },
    conceptUnderstood: {
      type: Boolean,
      default: false
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

ticketReviewSchema.index({ ticket: 1, reviewer: 1, reviewee: 1 }, { unique: true });
ticketReviewSchema.index({ reviewee: 1, createdAt: -1 });

const TicketReview = mongoose.model('TicketReview', ticketReviewSchema);

export default TicketReview;
