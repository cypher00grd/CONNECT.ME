import mongoose from 'mongoose';

const techBadgeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['sessions', 'expertise', 'mentorship', 'earnings', 'consistency'],
      default: 'sessions'
    },
    icon: {
      type: String,
      default: 'award'
    }
  },
  {
    timestamps: true
  }
);

const TechBadge = mongoose.model('TechBadge', techBadgeSchema);

export default TechBadge;
