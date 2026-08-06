import mongoose from 'mongoose';
import { TECH_CATEGORIES, normalizeCategory } from '../utils/categories.js';

const SESSION_TYPES = [
  'pair_programming',
  'code_review',
  'debugging',
  'system_design',
  'architecture_review',
  'mock_interview',
  'deployment_help',
  'workshop',
  'open_discussion',
  'mentoring',
  'other'
];

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'any'];

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

const codeSnippetSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      trim: true,
      maxlength: 30,
      default: 'text'
    },
    code: {
      type: String,
      maxlength: 10000,
      default: ''
    },
    title: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ''
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

const sharedEditorSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'Scratchpad'
    },
    language: {
      type: String,
      trim: true,
      maxlength: 30,
      default: 'javascript'
    },
    code: {
      type: String,
      maxlength: 20000,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
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
      enum: TECH_CATEGORIES,
      default: 'other'
    },
    techTags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 8,
        message: 'Rooms can include up to 8 tech tags'
      }
    },
    difficulty: {
      type: String,
      enum: DIFFICULTIES,
      default: 'any'
    },
    sessionType: {
      type: String,
      enum: SESSION_TYPES,
      default: 'open_discussion'
    },
    codeSnippets: {
      type: [codeSnippetSchema],
      default: [],
      validate: {
        validator: (snippets) => snippets.length <= 10,
        message: 'Rooms can include up to 10 code snippets'
      }
    },
    repositoryUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    sharedEditor: {
      type: sharedEditorSchema,
      default: () => ({})
    },
    type: {
      type: String,
      enum: ['standard', 'live_event', 'vod_session', 'issue_session'],
      default: 'standard'
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    scheduledStartTime: {
      type: Date,
      default: null
    },
    entryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IssuePost',
      default: null
    },
    participants: {
      type: [participantSchema],
      default: []
    },
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
      enum: ['scheduled', 'active', 'ended'],
      default: 'active'
    },
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

roomSchema.pre('validate', function () {
  this.category = normalizeCategory(this.category);
  this.techTags = normalizeStringArray(this.techTags, 8);

  if (this.sharedEditor) {
    this.sharedEditor.language = typeof this.sharedEditor.language === 'string'
      ? this.sharedEditor.language.trim().toLowerCase().slice(0, 30) || 'javascript'
      : 'javascript';
    this.sharedEditor.title = typeof this.sharedEditor.title === 'string'
      ? this.sharedEditor.title.trim().slice(0, 80) || 'Scratchpad'
      : 'Scratchpad';
    this.sharedEditor.code = typeof this.sharedEditor.code === 'string'
      ? this.sharedEditor.code.slice(0, 20000)
      : '';
  }
});

// Useful indexes (NO TTL index -- kept intentional)
roomSchema.index({ creator: 1, status: 1 });
roomSchema.index({ creator: 1, status: 1, scheduledStartTime: 1 });
roomSchema.index({ type: 1, status: 1, scheduledStartTime: 1 });
roomSchema.index({ sessionType: 1, difficulty: 1, techTags: 1 });
roomSchema.index({ ticket: 1 });
roomSchema.index({ issue: 1 });
roomSchema.index({ status: 1, createdAt: -1 });
roomSchema.index({ autoDeleteAt: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
