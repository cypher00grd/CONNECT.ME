// models/Room.js
import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Room title is required'],
      trim: true,
      maxlength: 100
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    category: {
      type: String,
      enum: [
        'singing',
        'travel',
        'gaming',
        'study',
        'coding',
        'music',
        'art',
        'fitness',
        'cooking',
        'other'
      ],
      default: 'other'
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    participants: [participantSchema],

    maxParticipants: {
      type: Number,
      default: 10,
      min: 2,
      max: 50
    },

    isVideoEnabled: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active'
    },

    /** 
     * Auto-delete time
     * This will NOT delete the document — only used by cleanup job
     */
    autoDeleteAt: {
      type: Date,
      default: null
    },

    endedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Useful indexes (NO TTL index — kept intentional)
roomSchema.index({ creator: 1, status: 1 });
roomSchema.index({ status: 1, createdAt: -1 });
roomSchema.index({ autoDeleteAt: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
