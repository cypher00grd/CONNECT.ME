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

const issuePostSchema = new mongoose.Schema(
  {
    poster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      maxlength: 120
    },
    details: {
      type: String,
      required: [true, 'Issue details are required'],
      trim: true,
      maxlength: 5000
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
    bountyAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'cancelled'],
      default: 'open'
    },
    acceptedResolver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null
    },
    paymentStatus: {
      type: String,
      enum: ['not_required', 'unpaid', 'pending', 'paid', 'failed', 'refunded'],
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
    paymentPaidAt: {
      type: Date,
      default: null
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

issuePostSchema.pre('validate', function () {
  if (Array.isArray(this.tags)) {
    this.tags = normalizeStringArray(this.tags, 5);
  }

  if (Array.isArray(this.techStack)) {
    this.techStack = normalizeStringArray(this.techStack, 8);
  }

  if (this.isNew || this.isModified('bountyAmount')) {
    this.paymentStatus = this.bountyAmount > 0 ? 'unpaid' : 'not_required';
  }
});

issuePostSchema.index({ status: 1, tags: 1, bountyAmount: -1, createdAt: -1 });
issuePostSchema.index({ poster: 1, createdAt: -1 });
issuePostSchema.index({ acceptedResolver: 1, status: 1 });
issuePostSchema.index({ stripeCheckoutSessionId: 1 });
issuePostSchema.index({ stripePaymentIntentId: 1 });

const IssuePost = mongoose.model('IssuePost', issuePostSchema);

export default IssuePost;
