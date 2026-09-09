import mongoose, { Document, Schema } from "mongoose";

export type KitStatus =
  | "draft"
  | "generating"
  | "ready"
  | "failed";

export interface IKit extends Document {
  userId: mongoose.Types.ObjectId;

  status: KitStatus;

  source: Record<string, unknown>;

  company_brief: Record<string, unknown>;

  role: Record<string, unknown>;

  questions: Record<string, unknown>[];

  flashcards: Record<string, unknown>[];

  schedule: Record<string, unknown>;

  coverage: Record<string, unknown>;

  itemState: {
    questions: Record<
      string,
      {
        origin: "generated" | "edited" | "pinned";
        updatedAt: Date;
      }
    >;

    flashcards: Record<
      string,
      {
        origin: "generated" | "edited" | "pinned";
        updatedAt: Date;
      }
    >;

    companyBrief: {
      origin: "generated" | "edited" | "pinned";
      updatedAt: Date;
    } | null;

    schedule: {
      origin: "generated" | "edited" | "pinned";
      updatedAt: Date;
    } | null;
  };

  practiceLog: {
    flashcardId: string;
    confidence: number;
    reviewedAt: Date;
  }[];

  createdAt: Date;
  updatedAt: Date;
}

const kitSchema = new Schema<IKit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["draft", "generating", "ready", "failed"],
      default: "draft",
    },

    source: {
      type: Schema.Types.Mixed,
      default: {},
    },

    company_brief: {
      type: Schema.Types.Mixed,
      default: {},
    },

    role: {
      type: Schema.Types.Mixed,
      default: {},
    },

    questions: {
      type: [Object],
      default: [],
    },

    flashcards: {
      type: [Object],
      default: [],
    },

    schedule: {
      type: Schema.Types.Mixed,
      default: {},
    },

    coverage: {
      type: Schema.Types.Mixed,
      default: {},
    },

    itemState: {
      type: Schema.Types.Mixed,
      default: {
        questions: {},
        flashcards: {},
        companyBrief: null,
        schedule: null,
      },
    },

    practiceLog: {
      type: [Object],
      default: [],
    },
  },

  {
    timestamps: true,
  }
);

export const Kit = mongoose.model<IKit>("Kit", kitSchema);