import mongoose from 'mongoose';

const articleVectorsSchema = new mongoose.Schema(
  {
    articleId: {
      type: String,
      required: true,
    },
    textChunk: {
      type: String,
      required: true,
    },
    embeddings: {
      type: [Number],
      required: true,
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

const ArticleVectors = mongoose.model('ArticleVectors', articleVectorsSchema);

export default ArticleVectors;
