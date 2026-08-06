import mongoose from 'mongoose';

const screenshotSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    size: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const SESSION_TYPES = [
  'debugging',
  'code_review',
  'pair_programming',
  'architecture_review',
  'mentoring',
  'mock_interview',
  'deployment_help',
  'other'
];

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const normalizeStringArray = (values, limit = 8) => {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
        .filter(Boolean)
    )
  ].slice(0, limit);
};

const ticketSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      required: [true, 'Ticket description is required'],
      trim: true,
      maxlength: 2000
    },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (tags) => tags.length > 0 && tags.length <= 5,
        message: 'Add between 1 and 5 tags'
      }
    },
    screenshots: {
      type: [screenshotSchema],
      default: [],
      validate: {
        validator: (screenshots) => screenshots.length <= 5,
        message: 'Add up to 5 screenshots'
      }
    },
    sessionType: {
      type: String,
      enum: SESSION_TYPES,
      default: 'debugging'
    },
    techStack: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 8,
        message: 'Add up to 8 technologies'
      }
    },
    difficulty: {
      type: String,
      enum: DIFFICULTIES,
      default: 'intermediate'
    },
    repoUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    errorContext: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ''
    },
    visibility: {
      type: String,
      enum: ['public', 'direct'],
      default: 'public'
    },
    targetHelper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    estimatedMinutes: {
      type: Number,
      enum: [30, 60, 90, 120],
      default: 30
    },
    bountyAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ['not_required', 'authorization_required', 'authorized', 'captured', 'released', 'refunded', 'failed'],
      default: 'not_required'
    },
    stripeCheckoutSessionId: {
      type: String,
      default: ''
    },
    stripePaymentIntentId: {
      type: String,
      default: ''
    },
    paymentAuthorizedAt: {
      type: Date,
      default: null
    },
    paymentCapturedAt: {
      type: Date,
      default: null
    },
    paymentReleasedAt: {
      type: Date,
      default: null
    },
    paymentRefundedAt: {
      type: Date,
      default: null
    },
    stripeRefundId: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['payment_pending', 'searching', 'direct_pending', 'locked', 'accepted', 'in_progress', 'resolved', 'cancelled'],
      default: 'searching'
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lockExpiresAt: {
      type: Date,
      default: null
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectedHelpers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null
    },
    sessionStartedAt: {
      type: Date,
      default: null
    },
    sessionEndedAt: {
      type: Date,
      default: null
    },
    minimumMetAt: {
      type: Date,
      default: null
    },
    actualDurationSeconds: {
      type: Number,
      default: 0,
      min: 0
    },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    exitReason: {
      type: String,
      enum: ['resolved', 'requester_early_exit', 'helper_early_exit', 'cancelled', ''],
      default: ''
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

ticketSchema.pre('validate', function () {
  if (Array.isArray(this.tags)) {
    this.tags = normalizeStringArray(this.tags, 5);
  }

  if (Array.isArray(this.techStack)) {
    this.techStack = normalizeStringArray(this.techStack, 8);
  }

  if (this.isNew || this.isModified('bountyAmount')) {
    this.paymentStatus = this.bountyAmount > 0 ? 'authorization_required' : 'not_required';
  }

  if (this.isNew && this.bountyAmount > 0) {
    this.status = 'payment_pending';
  }

  if (this.visibility !== 'direct') {
    this.targetHelper = null;
  }
});

ticketSchema.index({ status: 1, tags: 1, createdAt: -1 });
ticketSchema.index({ targetHelper: 1, status: 1, createdAt: -1 });
ticketSchema.index({ requester: 1, createdAt: -1 });
ticketSchema.index({ acceptedBy: 1, status: 1 });
ticketSchema.index({ lockedBy: 1, status: 1, lockExpiresAt: 1 });
ticketSchema.index({ stripeCheckoutSessionId: 1 });
ticketSchema.index({ stripePaymentIntentId: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
