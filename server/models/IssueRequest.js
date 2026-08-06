import mongoose from 'mongoose';

const issueRequestSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IssuePost',
      required: true
    },
    resolver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

issueRequestSchema.index({ issue: 1, resolver: 1 }, { unique: true });
issueRequestSchema.index({ issue: 1, status: 1, createdAt: -1 });
issueRequestSchema.index({ resolver: 1, status: 1, createdAt: -1 });

const IssueRequest = mongoose.model('IssueRequest', issueRequestSchema);

export default IssueRequest;
