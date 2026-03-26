const mongoose = require('mongoose');

const userWordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    word: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Word',
      required: true,
    },
    isLearned: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userWordSchema.index({ user: 1, word: 1 }, { unique: true });

module.exports = mongoose.model('UserWord', userWordSchema);
