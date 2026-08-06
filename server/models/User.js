import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const EXPERIENCE_LEVELS = ['student', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead'];
const SPECIALIZATIONS = ['frontend', 'backend', 'fullstack', 'devops', 'mobile', 'data_ml', 'system_design', 'security', 'dsa', 'other'];
const HELP_SESSION_TYPES = [
  'debugging',
  'code_review',
  'pair_programming',
  'architecture_review',
  'mentoring',
  'mock_interview',
  'deployment_help',
  'other'
];

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

const deriveSkillsFromTechStack = (techStack = {}) => (
  normalizeStringArray([
    ...(techStack.languages || []),
    ...(techStack.frameworks || []),
    ...(techStack.tools || [])
  ], 5)
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: ''
    },
    githubUsername: {
      type: String,
      trim: true,
      default: ''
    },
    githubUrl: {
      type: String,
      trim: true,
      default: ''
    },
    techStack: {
      languages: {
        type: [String],
        default: []
      },
      frameworks: {
        type: [String],
        default: []
      },
      tools: {
        type: [String],
        default: []
      }
    },
    experienceLevel: {
      type: String,
      enum: EXPERIENCE_LEVELS,
      default: 'mid'
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: 0,
      max: 50
    },
    specialization: {
      type: String,
      enum: SPECIALIZATIONS,
      default: 'other'
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills) => skills.length <= 5,
        message: 'You can select up to 5 skills'
      }
    },
    isInstructor: {
      type: Boolean,
      default: false
    },
    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    ratingTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0
    },
    penaltyPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    reputationPoints: {
      type: Number,
      default: 0
    },
    completedTickets: {
      type: Number,
      default: 0,
      min: 0
    },
    earlyExitCount: {
      type: Number,
      default: 0,
      min: 0
    },
    badges: {
      type: [String],
      default: []
    },
    ignoredTicketPings: {
      type: Number,
      default: 0,
      min: 0
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    sessionsCompleted: {
      type: Number,
      default: 0,
      min: 0
    },
    issuesResolved: {
      type: Number,
      default: 0,
      min: 0
    },
    codeReviewsGiven: {
      type: Number,
      default: 0,
      min: 0
    },
    hoursHelped: {
      type: Number,
      default: 0,
      min: 0
    },
    topTechTags: {
      type: [
        {
          tag: { type: String, trim: true },
          count: { type: Number, default: 0, min: 0 }
        }
      ],
      default: []
    },
    openToMentor: {
      type: Boolean,
      default: false
    },
    lookingForHelp: {
      type: Boolean,
      default: false
    },
    developerPreferences: {
      preferredSessionTypes: {
        type: [String],
        default: []
      },
      notificationTechTags: {
        type: [String],
        default: []
      },
      availabilityTimezone: {
        type: String,
        trim: true,
        maxlength: 80,
        default: 'Asia/Calcutta'
      },
      availabilityNote: {
        type: String,
        trim: true,
        maxlength: 240,
        default: ''
      },
      hourlyRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100000
      }
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isOnline: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('validate', function () {
  this.githubUsername = typeof this.githubUsername === 'string'
    ? this.githubUsername.trim().replace(/^@/, '')
    : '';
  this.githubUrl = typeof this.githubUrl === 'string' ? this.githubUrl.trim() : '';

  this.developerPreferences = {
    preferredSessionTypes: normalizeStringArray(
      this.developerPreferences?.preferredSessionTypes,
      8
    ).filter((type) => HELP_SESSION_TYPES.includes(type)),
    notificationTechTags: normalizeStringArray(this.developerPreferences?.notificationTechTags, 12),
    availabilityTimezone: typeof this.developerPreferences?.availabilityTimezone === 'string'
      ? this.developerPreferences.availabilityTimezone.trim().slice(0, 80) || 'Asia/Calcutta'
      : 'Asia/Calcutta',
    availabilityNote: typeof this.developerPreferences?.availabilityNote === 'string'
      ? this.developerPreferences.availabilityNote.trim().slice(0, 240)
      : '',
    hourlyRate: Number.isFinite(Number(this.developerPreferences?.hourlyRate))
      ? Math.max(0, Math.min(Number(this.developerPreferences.hourlyRate), 100000))
      : 0
  };

  this.techStack = {
    languages: normalizeStringArray(this.techStack?.languages, 8),
    frameworks: normalizeStringArray(this.techStack?.frameworks, 8),
    tools: normalizeStringArray(this.techStack?.tools, 8)
  };

  if (Array.isArray(this.skills)) {
    this.skills = [
      ...new Set(
        this.skills
          .map((skill) => (typeof skill === 'string' ? skill.trim().toLowerCase() : ''))
          .filter(Boolean)
      )
    ].slice(0, 5);
  }

  if (this.skills.length === 0) {
    this.skills = deriveSkillsFromTechStack(this.techStack);
  }

  this.openToMentor = this.openToMentor || this.isInstructor;
  this.isInstructor = this.isInstructor || this.openToMentor;
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});


// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

userSchema.index({ skills: 1, isOnline: 1, rating: -1 });
userSchema.index({ isInstructor: 1, rating: -1 });
userSchema.index({ specialization: 1, experienceLevel: 1, rating: -1 });
userSchema.index({ 'techStack.languages': 1 });
userSchema.index({ 'techStack.frameworks': 1 });
userSchema.index({ 'techStack.tools': 1 });

const User = mongoose.model('User', userSchema);

export default User;
