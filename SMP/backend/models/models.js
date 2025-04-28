const mongoose = require("mongoose");

// User Schema
const userSchema = new mongoose.Schema({
    keycloakId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    role: { type: String, enum: ["Seeker", "Provider"], required: true },
    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true, index: "2dsphere" }
    }
}, { timestamps: true });

// Job Schema
const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    seekerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true, index: "2dsphere" }
    },
    budget: { type: mongoose.Types.Decimal128, required: true },
    status: { type: String, enum: ["Open", "In Progress", "Completed", "Cancelled"], default: "Open" },
    assignedProviderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

// Bid Schema
const bidSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amountOffered: { type: mongoose.Types.Decimal128, required: true },
    message: { type: String },
    status: { type: String, enum: ["Pending", "Accepted", "Rejected"], default: "Pending" }
}, { timestamps: true });

// Payment Schema
const paymentSchema = new mongoose.Schema({
    seekerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    amount: { type: mongoose.Types.Decimal128, required: true },
    status: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Pending" },
    paymentMethod: { type: String, enum: ["Cash", "Credit Card", "Mobile Money"], required: true },
    transactionReference: { type: String, unique: true }
}, { timestamps: true });

// Category Schema
const categorySchema = new mongoose.Schema({
    categoryName: { type: String, required: true, unique: true }
}, { timestamps: true });

// Address Schema
const addressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
});

// Rating Schema
const ratingSchema = new mongoose.Schema({
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true }
}, { timestamps: true });

module.exports = {
    User: mongoose.model("User", userSchema),
    Job: mongoose.model("Job", jobSchema),
    Bid: mongoose.model("Bid", bidSchema),
    Payment: mongoose.model("Payment", paymentSchema),
    Category: mongoose.model("Category", categorySchema),
    Address: mongoose.model("Address", addressSchema),
    Rating: mongoose.model("Rating", ratingSchema)
};
