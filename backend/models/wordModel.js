const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    meaning: {
      type: String,
      required: true,
      trim: true,
    },
    synonyms: {
      type: [String],
      default: [],
    },
    antonyms: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model('Word', wordSchema);
