import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    hr: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    company:     { type: String, trim: true },

    // Derived from interviews — stored for fast dashboard display
    jobRole:     { type: String, trim: true },
    techStack:   [String],

    status: {
      type: String,
      enum: ["active", "closed", "archived"],
      default: "active",
    },

    // Deadline / event date (optional)
    deadline: { type: Date },

    color: {
      type: String,
      enum: ["cyan", "green", "amber", "purple", "red"],
      default: "cyan",
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: count of interviews in this project (populated separately)
projectSchema.index({ hr: 1, createdAt: -1 });

export default mongoose.model("Project", projectSchema);
