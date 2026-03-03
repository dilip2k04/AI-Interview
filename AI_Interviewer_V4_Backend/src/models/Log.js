import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  time: {
    type: Date,
    default: Date.now,
    required: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  }
});

// collection name will be "logs"
const Log = mongoose.model("Log", logSchema);

export default Log;