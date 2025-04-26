import mongoose from 'mongoose';

const documentVectorsSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
    },
    filename: {
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

const DocumentVectors = mongoose.model(
  'DocumentVectors',
  documentVectorsSchema
);

export default DocumentVectors;
