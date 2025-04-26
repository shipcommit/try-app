import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    textChunks: {
      type: [String],
      default: [],
    },
    embeddings: {
      type: [[Number]],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Article = mongoose.model('Article', articleSchema);

export default Article;
