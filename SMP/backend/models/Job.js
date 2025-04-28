const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    seekerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: false, index: "2dsphere" },
    },
    altLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    budget: { type: mongoose.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Completed","Pending", "Cancelled"],
      default: "Open",
    },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    category: { type: String, required: true }, // Added category name
    attributes: { type: Object, default: {} },    // Added attributes
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", JobSchema);
