import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['image'],
      default: 'image'
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

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
      default: ''
    },
    type: {
      type: String,
      enum: ['text', 'image', 'reaction', 'system'],
      default: 'text'
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: (attachments) => attachments.length <= 5,
        message: 'Messages can include up to 5 attachments'
      }
    }
  },
  {
    timestamps: true
  }
);

messageSchema.pre('validate', function () {
  const hasContent = typeof this.content === 'string' && this.content.trim().length > 0;
  const hasAttachments = Array.isArray(this.attachments) && this.attachments.length > 0;

  if (!hasContent && !hasAttachments && this.type !== 'system') {
    this.invalidate('content', 'Message content or an attachment is required');
  }

  if (hasAttachments && !hasContent) {
    this.type = 'image';
  }
});

// Index for fetching messages by room
messageSchema.index({ room: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
