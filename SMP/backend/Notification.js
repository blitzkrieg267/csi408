const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { 
    type: String, 
    enum: ["NEW_BID", "BID_ACCEPTED", "JOB_STATUS_CHANGED", "JOB_ASSIGNED"],
    required: true 
  },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", NotificationSchema);
