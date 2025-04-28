const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    attributes: { type: Map, of: String }, // Dynamic key-value pairs for special attributes
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);