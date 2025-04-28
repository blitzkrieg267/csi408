// seedLocations.js
const mongoose = require("mongoose");
const Location = require("./Location"); // adjust path as needed

require("dotenv").config();
const MONGO_URI = "mongodb://localhost:27017/task_app_db";

const locations = [
  { name: "Gaborone", coordinates: [25.9231, -24.6282] },
  { name: "Francistown", coordinates: [27.5079, -21.1702] },
  { name: "Molepolole", coordinates: [25.5126, -24.4067] },
  { name: "Maun", coordinates: [23.4300, -19.9833] },
  { name: "Serowe", coordinates: [26.7107, -22.3873] },
  { name: "Kanye", coordinates: [25.3519, -24.9667] },
  { name: "Mochudi", coordinates: [26.1500, -24.4000] },
  { name: "Palapye", coordinates: [27.1200, -22.5500] },
  { name: "Lobatse", coordinates: [25.6800, -25.2200] },
  { name: "Ramotswa", coordinates: [25.8699, -24.8716] },
  { name: "Selibe Phikwe", coordinates: [27.8333, -21.9833] },
  { name: "Ghanzi", coordinates: [21.6937, -21.5667] },
  { name: "Kasane", coordinates: [25.1561, -17.7983] },
  { name: "Letlhakane", coordinates: [25.5833, -21.4167] },
  { name: "Moshupa", coordinates: [25.4197, -24.7716] },
  { name: "Shakawe", coordinates: [21.8500, -18.3667] },
  { name: "Tonota", coordinates: [27.4600, -21.4400] },
  { name: "Bobonong", coordinates: [28.0500, -22.2000] },
  { name: "Tlokweng", coordinates: [25.9667, -24.6500] },
  { name: "Jwaneng", coordinates: [24.6028, -24.6017] }
];

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log("Connected to MongoDB. Seeding locations...");

    // Clear existing locations (optional)
    await Location.deleteMany({});

    const formatted = locations.map((loc) => ({
      name: loc.name,
      coordinates: {
        type: "Point",
        coordinates: loc.coordinates,
      },
    }));

    await Location.insertMany(formatted);
    console.log("✅ Locations seeded successfully!");
  } catch (err) {
    console.error("Error seeding locations:", err);
  } finally {
    mongoose.connection.close();
  }
};

seed();
