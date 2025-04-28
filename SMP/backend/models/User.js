// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phoneNumber: String,
  userType: { type: String, enum: ["Seeker", "Provider"] },
  profilePicture: String,
  bio: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  providerAttributes: {
    birthday: Date,
    baseLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    selectedCategories: [
      {
        categoryId: String,
        attributes: {
          type: Map,
          of: String,
        },
      },
    ],
  },
});

module.exports = mongoose.model("User", userSchema);
//const mongoose = require("mongoose");
//
//const UserSchema = new mongoose.Schema(
//  {
//    clerkId: { type: String, required: true, unique: true }, // Clerk authentication ID
//    firstName: { type: String, required: true },
//    lastName: { type: String, required: true },
//    email: { type: String, required: true, unique: true },
//    phoneNumber: { type: String, required: true },
//    userType: { type: String, enum: ["Seeker", "Provider"], required: true },
//    profilePicture: { type: String },
//    bio: { type: String },
//  },
//  { timestamps: true }
//);
//
//module.exports = mongoose.model("User", UserSchema);
