const express = require("express");
const User = require("../models/User");
const Job = require("../models/Job");
const Bid = require("../models/Bid");
const Location = require("../models/Location");
const Payment = require("../models/Payment");
const Category = require("../models/Category");
const Address = require("../models/Address");
const Rating = require("../models/Rating");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { ClerkExpressWithAuth } = require("@clerk/clerk-sdk-node");
const router = express.Router();
const { users } = require("@clerk/clerk-sdk-node");
const { ObjectId } = require("mongodb");
const { getDB } = require("../src/config/db"); // Import database connection
const { connectDB } = require("../src/config/db"); // Import database connection
const Notification = require("../models/Notification");

/**
 * @swagger
 * tags:
 *   - name: Jobs
 *     description: Job management endpoints
 *   - name: Bids
 *     description: Bid management endpoints
 *   - name: Users
 *     description: User management endpoints
 *   - name: Locations
 *     description: Location management endpoints
 *   - name: Payments
 *     description: Payment management endpoints
 *   - name: Categories
 *     description: Category management endpoints
 *   - name: Ratings
 *     description: Rating management endpoints
 *   - name: Notifications
 *     description: Notification management endpoints
 */

/**
 * @swagger
 * /getOpenJobs:
 *   get:
 *     summary: Get all open jobs
 *     description: Retrieve a list of all jobs with status 'Open'
 *     tags: [Jobs]
 *     security:
 *       - ClerkAuth: []
 *     responses:
 *       200:
 *         description: List of open jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 *       500:
 *         description: Server error
 */
router.get("/getOpenJobs", async (req, res) => {
    try {
        const db = getDB();
        const openJobs = await db.collection("jobs").find({ status: "Open" }).toArray();
        res.json(openJobs);
    } catch (error) {
        console.error("Error fetching open jobs:", error);
        res.status(500).json({ error: "Failed to fetch open jobs" });
    }
});

/**
 * @swagger
 * /submitBid:
 *   post:
 *     summary: Submit a bid for a job
 *     description: Create a new bid for a specific job
 *     tags: [Bids]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobId
 *               - providerId
 *               - amount
 *             properties:
 *               jobId:
 *                 type: string
 *                 description: ID of the job to bid on
 *               providerId:
 *                 type: string
 *                 description: ID of the provider submitting the bid
 *               amount:
 *                 type: number
 *                 description: Bid amount
 *               description:
 *                 type: string
 *                 description: Optional message to the seeker
 *     responses:
 *       201:
 *         description: Bid created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bid'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Job or provider not found
 *       500:
 *         description: Server error
 */
router.post("/submitBid", async (req, res) => {
    try {
        const db = getDB();
        const { jobId, providerId, amount, description } = req.body;

        // Validate ObjectId format
        if (!ObjectId.isValid(jobId) || !ObjectId.isValid(providerId)) {
            return res.status(400).json({ error: "Invalid Job ID or Provider ID format." });
        }

        const jobExists = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });
        const providerExists = await db.collection("users").findOne({ _id: new ObjectId(providerId), userType: "Provider" });

        if (!jobExists || !providerExists) {
            return res.status(404).json({ error: "Job or Provider not found." });
        }

        const newBid = new Bid({
            jobId: jobId,
            providerId: providerId,
            amount: parseFloat(amount),
            description: description,
        });

        const savedBid = await newBid.save();
        res.status(201).json(savedBid);
    } catch (error) {
        console.error("Error submitting bid:", error);
        res.status(400).json({ error: error.message });
    }
});

// Define upload folder
const uploadDir = path.join(__dirname, "../uploads");

// Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage
const db = getDB(); // ✅ Get database instance here

// Middleware to authenticate requests
router.use(ClerkExpressWithAuth());

const verifyClerkSignature = (req, res, next) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  const signature = req.headers["clerk-signature"];

  if (!signature) {
    return res.status(401).json({ error: "Missing Clerk signature" });
  }

  const computedSignature = crypto.createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (computedSignature !== signature) {
    return res.status(403).json({ error: "Invalid Clerk signature" });
  }

  next();
};

router.post("/clerk-webhook", verifyClerkSignature, async (req, res) => {
         try {
           const { id, first_name, last_name, email_addresses, primary_phone_number } = req.body.data;

           const existingUser = await User.findOne({ clerkId: id });
           if (existingUser) {
             return res.status(200).json({ message: "User already exists" });
           }

           const newUser = new User({
             clerkId: id,
             firstName: first_name,
             lastName: last_name,
             email: email_addresses[0]?.email_address || "",
             phoneNumber: primary_phone_number || "",
             userType: "Seeker", // Default, can be changed later
             createdAt: new Date(),
             updatedAt: new Date(),
           });

           await newUser.save();
           res.status(201).json({ message: "User saved to MongoDB" });
         } catch (error) {
           console.error("Error saving user:", error);
           res.status(500).json({ error: "Internal server error" });
         }
       });

/**
 * @swagger
 * /seeker/dashboard/{seekerId}:
 *   get:
 *     summary: Get seeker dashboard data
 *     description: Retrieve dashboard statistics for a specific seeker
 *     tags: [Users]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: seekerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the seeker
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 openJobs:
 *                   type: number
 *                   description: Number of open jobs
 *                 completedJobs:
 *                   type: number
 *                   description: Number of completed jobs
 *                 activeBids:
 *                   type: number
 *                   description: Number of active bids
 *       400:
 *         description: Missing seekerId
 *       500:
 *         description: Server error
 */
router.get("/seeker/dashboard/:seekerId", async (req, res) => {
  try {
   const db = getDB(); // ✅ Get database instance here

    const { seekerId } = req.params;
    if (!seekerId) return res.status(400).json({ error: "Missing seekerId" });

    const seekerObjectId = new ObjectId(seekerId); // Convert if stored as ObjectId

    const openJobs = await db.collection("jobs").countDocuments({
      seekerId: seekerObjectId,
      status: "Open",
    });

    const completedJobs = await db.collection("jobs").countDocuments({
      seekerId: seekerObjectId,
      status: "Completed",
    });

    const activeBids = await db.collection("bids").countDocuments({
      seekerId: seekerObjectId,
    });

    res.json({ openJobs, completedJobs, activeBids });
  } catch (error) {
    console.error("Error fetching seeker dashboard:", error);
    res.status(500).json({ error: "Error fetching dashboard data" });
  }
});


router.post('/addLocations', async (req, res) => {
  try {
    const locations = req.body.locations;

    if (!Array.isArray(locations)) {
      return res.status(400).json({ message: 'locations must be an array' });
    }

    await Location.insertMany(locations);
    res.status(201).json({ message: 'Locations added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Folder must exist
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });


router.post("/completeSignupUser", upload.single("profilePicture"), async (req, res) => {
  try {
    const { 
      clerkId, 
      phoneNumber, 
      bio, 
      userType, 
      email, 
      firstName, 
      lastName
    } = req.body;
    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;
    const db = getDB();

    if (!clerkId || !userType || !email) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const existingUser = await db.collection("users").findOne({ clerkId });

    if (existingUser) {
      // User exists, update their profile
      const updateData = {
            phoneNumber,
            bio,
            profilePicture,
            firstName,
            lastName,
            updatedAt: new Date(),
      };

      await db.collection("users").updateOne(
        { clerkId },
        { $set: updateData }
      );

      const updatedUser = await db.collection("users").findOne({ clerkId });
      res.status(200).json({ message: "Profile updated successfully.", user: updatedUser });
    } else {
      // User does not exist, create a new user
      const newUser = {
        clerkId,
        phoneNumber,
        bio,
        profilePicture,
        userType,
        email,
        firstName,
        lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("users").insertOne(newUser);
      const createdUser = await db.collection("users").findOne({ _id: result.insertedId });
      res.status(201).json({ message: "Profile created successfully.", user: createdUser });
    }

  } catch (error) {
    console.error("Error completing signup:", error);
    res.status(500).json({ error: "Error updating/creating profile." });
  }
});

// New endpoint specifically for providers
router.post("/completeProviderSignup", upload.single("profilePicture"), async (req, res) => {
  try {
    console.log("Provider signup request received:", {
      body: req.body,
      file: req.file ? req.file.filename : "No file uploaded"
    });

    const { 
      clerkId, 
      phoneNumber, 
      bio, 
      email, 
      firstName, 
      lastName,
      categoryId,
      attributes
    } = req.body;
    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;
    const db = getDB();

    // Validate required fields
    if (!clerkId || !email || !categoryId) {
      console.log("Missing required fields:", { clerkId, email, categoryId });
      return res.status(400).json({ 
        error: "Missing required fields.",
        details: {
          clerkId: !clerkId ? "Missing" : "Present",
          email: !email ? "Missing" : "Present",
          categoryId: !categoryId ? "Missing" : "Present"
        }
      });
    }

    console.log("Looking up existing provider with clerkId:", clerkId);
    const existingUser = await db.collection("users").findOne({ clerkId });

    if (existingUser) {
      console.log("Found existing provider, updating profile");
      // Provider exists, update their profile
      const updateData = {
        phoneNumber,
        bio,
        profilePicture,
        firstName,
        lastName,
        categoryId,
        attributes,
        updatedAt: new Date(),
      };

      console.log("Updating provider with data:", updateData);
      const updateResult = await db.collection("users").updateOne(
        { clerkId },
        { $set: updateData }
      );

      if (updateResult.modifiedCount === 0) {
        console.log("No changes made to provider profile");
        return res.status(200).json({ 
          message: "No changes made to provider profile.",
          user: existingUser 
        });
      }

      const updatedUser = await db.collection("users").findOne({ clerkId });
      console.log("Provider profile updated successfully");
      res.status(200).json({ 
        message: "Provider profile updated successfully.", 
        user: updatedUser,
        alert: "Profile updated successfully!"
      });
    } else {
      console.log("Creating new provider profile");
      // Provider does not exist, create a new provider
      const newUser = {
        clerkId,
        phoneNumber,
        bio,
        profilePicture,
        userType: "Provider",
        email,
        firstName,
        lastName,
        categoryId,
        attributes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log("Inserting new provider with data:", newUser);
      const result = await db.collection("users").insertOne(newUser);
      const createdUser = await db.collection("users").findOne({ _id: result.insertedId });
      console.log("New provider profile created successfully");
      res.status(201).json({ 
        message: "Provider profile created successfully.", 
        user: createdUser,
        alert: "Profile created successfully!"
      });
    }

  } catch (error) {
    console.error("Error in completeProviderSignup:", error);
    res.status(500).json({ 
      error: "Error updating/creating provider profile.",
      details: error.message
    });
  }
});

async function fetchUserByClerkIdFromDB(clerkId) {
  console.log("fetchUserByClerkIdFromDB called with clerkId:", clerkId);
  const db = getDB();
  console.log("Database connection established");
  
  try {
  const user = await db.collection("users").findOne({ clerkId: clerkId });
    console.log("Database query result:", user);
  return user;
  } catch (error) {
    console.error("Error in fetchUserByClerkIdFromDB:", error);
    throw error;
  }
}


router.post("/addUser", upload.single("profilePicture"), async (req, res) => {
  try {
    const {
      clerkId, // received from frontend
      firstName,
      lastName,
      email,
      phoneNumber,
      userType,
      bio,
    } = req.body;

    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

    if (!clerkId) {
      return res.status(400).json({ error: "Missing Clerk user ID" });
    }

    const newUserData = {
      clerkId,
      firstName,
      lastName,
      email,
      phoneNumber,
      userType: userType || "Seeker",
      profilePicture,
      bio,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newUser = new User(newUserData);
    await newUser.save();

    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Error creating user", details: error.message });
  }
});

router.get("/getProviderDashboard/:clerkId", async (req, res) => {
  const { clerkId } = req.params;

  const provider = await User.findOne({ clerkId });
  if (!provider || provider.userType !== "Provider") {
    return res.status(404).json({ error: "Provider not found" });
  }

  const activeBids = await Bid.countDocuments({ providerId: provider._id, status: "Pending" });
  const jobsWon = await Bid.countDocuments({ providerId: provider._id, status: "Accepted" });
  const completedJobs = await Bid.countDocuments({ providerId: provider._id, status: "Completed" });

  res.json({ activeBids, jobsWon, completedJobs });
});
router.get('/getProviderJobHistory/:providerId', async (req, res) => {
  const { providerId } = req.params;

  // Validate ObjectId format
  if (!ObjectId.isValid(providerId)) {
    return res.status(400).json({ message: "Invalid Provider ID format." });
  }

  console.log(`Request received for /api/getProviderJobHistory/${providerId}`);

  try {
    const db = getDB(); // Use the MongoDB native driver
    const jobHistory = await db.collection("jobs").find({
      providerId: new ObjectId(providerId),
      status: { $in: ['In Progress', 'Completed', 'Cancelled'] }
    }).sort({ updatedAt: -1, createdAt: -1 }).toArray();

    console.log(`Found ${jobHistory.length} jobs for provider ${providerId}.`);
    res.status(200).json(jobHistory);
  } catch (error) {
    console.error(`Error fetching job history for provider ${providerId}:`, error);
    res.status(500).json({ message: "Error fetching job history from database", error: error.message });
  }
});

router.get("/getProviderJobsAttempted/:providerId", async (req, res) => {
  const providerId = req.params.providerId;
  try {
    const db = getDB(); // Get the database instance
    if (!ObjectId.isValid(providerId)) { // Validate providerId
      return res.status(400).json({ error: "Invalid providerId format" });
    }
    const jobsAttempted = await db.collection("bids").countDocuments({
      providerId: new ObjectId(providerId),
      status: "Rejected",
    });
    res.json({ jobsAttempted });
  } catch (error) {
    console.error("Error fetching jobs attempted:", error);
    res.status(500).json({ error: "Failed to fetch jobs attempted" });
  }
});

// 2. Get Completed Jobs
router.get("/getProviderCompletedJobs/:providerId", async (req, res) => {
  const providerId = req.params.providerId;
  try {
    const db = getDB(); // Get the database instance
    if (!ObjectId.isValid(providerId)) {  // Validate providerId
      return res.status(400).json({ error: "Invalid providerId format" });
    }
    const completedJobs = await db.collection("jobs").countDocuments({ // Changed to db.collection
      providerId: new ObjectId(providerId),
      status: "Completed",
    });
    res.json({ completedJobs });
  } catch (error) {
    console.error("Error fetching completed jobs:", error);
    res.status(500).json({ error: "Failed to fetch completed jobs" });
  }
});

// 3. Get Amount Earned
router.get("/getProviderAmountEarned/:providerId", async (req, res) => {
    const providerId = req.params.providerId;
    console.log(`getProviderAmountEarned called with providerId: ${providerId}`);

    try {
        const db = getDB();
        if (!ObjectId.isValid(providerId)) {
            const errorMessage = "Invalid providerId format";
            console.error(errorMessage);
            return res.status(400).json({ error: errorMessage });
        }

        // Use aggregation to sum the budgets of completed jobs for the provider.
        const result = await db.collection("jobs").aggregate([
            {
                $match: {
                    providerId: new ObjectId(providerId),
                    status: "Completed" // Only consider completed jobs
                }
            },
            {
                $group: {
                    _id: null,
                    //  Sum the 'budget' field from the jobs collection and convert to double
                    amountEarned: { $sum: { $toDouble: "$budget" } }
                }
            }
        ]).toArray();

        console.log("Aggregation result:", result);

        let amountEarned = 0;
         if (result.length > 0 && result[0]?.amountEarned !== undefined) {
            amountEarned = result[0].amountEarned;
        }
        console.log(`Amount earned: ${amountEarned}`);
        res.json({ amountEarned });

    } catch (error) {
        console.error("Error fetching amount earned:", error);
        res.status(500).json({ error: "Failed to fetch amount earned", details: error.message });
    }
});

// 4. Get Last Completed Job
router.get("/getProviderLastCompletedJob/:providerId", async (req, res) => {
  const providerId = req.params.providerId;
  try {
    const db = getDB(); // Get the database instance
    if (!ObjectId.isValid(providerId)) {  // Validate providerId
      return res.status(400).json({ error: "Invalid providerId format" });
    }
    const lastCompletedJob = await db.collection("jobs").find({ // Changed to db.collection
      providerId: new ObjectId(providerId),
      status: "Completed",
    })
      .sort({ updatedAt: -1 }) // Sort by completion date,  use updatedAt
      .limit(1)
      .toArray();

    const completedJob = lastCompletedJob.length > 0 ? lastCompletedJob[0] : null;
    res.status(200).json({ lastCompletedJob: completedJob ? completedJob.updatedAt : null }); // Return updatedAt
  } catch (error) {
    console.error("Error fetching last completed job:", error);
    res.status(500).json({ error: "Failed to fetch last completed job" });
  }
});

// 5. Get Jobs Won (Accepted Bids)
router.get("/getProviderJobsWon/:providerId", async (req, res) => {
  const providerId = req.params.providerId;
  try {
    const db = getDB(); // Get the database instance
    if (!ObjectId.isValid(providerId)) {  // Validate providerId
      return res.status(400).json({ error: "Invalid providerId format" });
    }
    const jobsWon = await db.collection("bids").countDocuments({
      providerId: new ObjectId(providerId),
      status: "Accepted",
    });
    res.json({ jobsWon });
  } catch (error) {
    console.error("Error fetching jobs won:", error);
    res.status(500).json({ error: "Failed to fetch jobs won" });
  }
});


// Add this code to your routes.js file

// ✅ Add Category to Provider
router.post("/provider/addCategory", async (req, res) => {
  try {
    const { categoryId, attributes } = req.body;
    const { clerkId } = req; // Assuming you have the clerkId from the authenticated user

    // Find the provider by clerkId
    const provider = await User.findOne({ clerkId });
    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // Check if the category already exists in the provider's categories
    const existingCategory = provider.providerAttributes.selectedCategories.find(cat => cat.categoryId === categoryId);
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    // Add the new category to the provider's selectedCategories
    provider.providerAttributes.selectedCategories.push({ categoryId, attributes });

    // Save the updated provider document
    await provider.save();

    res.status(201).json({ message: "Category added successfully", provider });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add this code to your routes.js file

// GET /api/provider/details
router.get("/provider/details/:clerkId", async (req, res) => {
  try {
    const { clerkId } = req.params; // Get clerkId from request parameters

    // Fetch the provider's details from the database
    const provider = await User.findOne({ clerkId });
    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // Return the provider details
    res.json({
      firstName: provider.firstName,
      lastName: provider.lastName,
      email: provider.email,
      phoneNumber: provider.phoneNumber,
      bio: provider.bio,
      providerAttributes: provider.providerAttributes,
      // Add any other relevant details here
    });
  } catch (error) {
    console.error("Error fetching provider details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/getUser/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

    router.get("/getUserByClerkId/:clerkId", async (req, res) => {
      try {
        const db = getDB();
        const user = await db.collection("users").findOne({ clerkId: req.params.clerkId });
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
      } catch (error) {
        console.error("Error fetching user by Clerk ID:", error);
        res.status(500).json({ error: "Server error" });
      }
    });



router.get("/getLocations", async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});


// ✅ Add Job
router.post("/addJob", async (req, res) => {
  try {
    console.log("Received job data:", req.body);

    const {
      title,
      description,
      categoryId,
      category, // Include category name
      budget,
      location,
      altLocationId,
      attributes,
      seekerId,
    } = req.body;

    if (
      !title ||
      !description ||
      !categoryId ||
      !category || // Ensure category name is present
      !budget ||
      !location ||
      !seekerId
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const job = new Job({
      title,
      description,
      categoryId,
      category, // Store the category name
      budget,
      location: location || undefined,
      altLocationId: altLocationId || undefined,
      attributes: attributes || {},
      seekerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await job.save();

    // Get all providers who have this category in their selected categories
    const providers = await User.find({
      userType: "Provider",
      "providerAttributes.selectedCategories.categoryId": categoryId
    });

    // Create notifications for each provider
    const notifications = providers.map(provider => ({
      userId: provider._id,
      type: "NEW_JOB",
      jobId: job._id,
      message: `New job available: "${title}" in ${category}`,
      read: false,
      createdAt: new Date()
    }));

    // Save all notifications
    await Notification.insertMany(notifications);

    // Emit Socket.IO events for each provider
    const io = req.app.get("io");
    notifications.forEach(notification => {
      io.emit("notification", {
        userId: notification.userId,
        notification: {
          type: "NEW_JOB",
          message: notification.message,
          jobId: job._id
        }
      });
    });

    res.status(201).json(job);
  } catch (error) {
    console.error("Error adding job:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get("/getJobs", async (req, res) => {
  try {
    console.log("getJobs endpoint called");
    const { status } = req.query;
    console.log("Query parameters:", req.query);
    
    const filter = status ? { status } : {};
    console.log("MongoDB filter:", filter);
    
    const jobs = await Job.find(filter);
    console.log("Found jobs:", jobs);
    
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error in getJobs:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/getJob/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/getJobsBySeekerId/:seekerId", async (req, res) => {
  try {
    const jobs = await Job.find({ seekerId: req.params.seekerId }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /seeker/jobs?seekerId=60a7c8...&status=Open

router.get("/seeker/jobs", async (req, res) => {
  try {
    const { seekerId, status } = req.query;

    // Check for missing parameters
    if (!seekerId || !status) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(seekerId)) {
      return res.status(400).json({ error: "Invalid seekerId format" });
    }

    // Fetch jobs from the database
    const jobs = await db
      .collection("jobs")
      .find({ seekerId: new ObjectId(seekerId), status }) // Convert to ObjectId
      .toArray();

    // ✅ Return an empty array if no jobs are found
    res.json(jobs.length > 0 ? jobs : []);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Error fetching jobs" });
  }
});

//router.post("/completeJob/:jobId", async (req, res) => {
//  const { jobId } = req.params;
//  const db = getDB();
//
//  if (!ObjectId.isValid(jobId)) {
//    return res.status(400).json({ error: "Invalid Job ID format." });
//  }
//
//  try {
//    const jobObjectId = new ObjectId(jobId);
//    const clerkUserId = req.auth?.userId;
//
//    // 1. Get the MongoDB User ID using the helper function
//    const userData = await fetchUserByClerkIdFromDB(clerkUserId);
//    if (!userData) {
//      console.error("MongoDB User not found for Clerk ID:", clerkUserId);
//      return res.status(404).json({ error: "User not found." });
//    }
//    const mongoSeekerObjectId = userData?._id; // Correct variable name
//
//    if (!mongoSeekerObjectId) {
//      return res.status(404).json({ error: "MongoDB User ID not found." });
//    }
//
//    // 2. Find the job and ensure it exists, is owned by the seeker, and is currently in progress
//    const job = await db.collection("jobs").findOne({
//      _id: jobObjectId,
//      seekerId: mongoSeekerObjectId, // Use the MongoDB ID
//      status: "In Progress",
//    });
//
//    if (!job) {
//      return res.status(404).json({ error: "Job not found or you are not authorized to complete it." });
//    }
//
//    // 3. Update the job status to "Completed"
//    const updateResult = await db.collection("jobs").updateOne(
//      { _id: jobObjectId },
//      { $set: { status: "Completed", updatedAt: new Date() } }
//    );
//
//    if (updateResult.modifiedCount > 0) {
//      // Emit a Socket.IO event to notify clients (especially the provider)
//      const io = req.app.get("io");  // Make sure you have access to the io instance
//      io.emit("jobCompleted", jobId); // Or you can send the whole updated job object if needed
//
//      res.json({ message: "Job completed successfully." });
//    } else {
//      res.status(404).json({ error: "Job not found for completion." }); //Should not happen, unless job was modified in between
//    }
//  } catch (error) {
//    console.error("Error completing job:", error);
//    res.status(500).json({ error: "Failed to complete job." });
//  }
//});

// ✅ Check Payment Status for a Job
 router.get("/checkPaymentStatus/:jobId", async (req, res) => {
  try {
  const jobId = req.params.jobId;
  const payment = await Payment.findOne({ jobId: jobId });

  if (!payment) {
  return res.status(200).json({ exists: false }); // No payment exists
  }

  res.status(200).json({ exists: true, status: payment.paymentStatus });
  } catch (error) {
  console.error("Error checking payment status:", error);
  res.status(500).json({ error: "Failed to check payment status" });
  }
 });

 // ✅ Create Payment for a Job
 router.post("/createPayment/:jobId", async (req, res) => {
  try {
  const jobId = req.params.jobId;

  // Check if a payment already exists to avoid duplicates
  const existingPayment = await Payment.findOne({ jobId: jobId });
  if (existingPayment) {
  return res.status(400).json({ error: "Payment already exists for this job" });
  }

  // Assuming you have the amount from the job or request body
  const job = await Job.findById(jobId);
  if (!job) {
  return res.status(404).json({ error: "Job not found" });
  }
  const amount = job.agreedAmount || job.budget || 0; // Or get from req.body if needed

  const newPayment = new Payment({
  jobId: jobId,
  amount: amount,
  paymentMethod: "Pending", // Or a default method
  paymentStatus: "Pending",
  });

  await newPayment.save();
  res.status(201).json(newPayment);
  } catch (error) {
  console.error("Error creating payment:", error);
  res.status(500).json({ error: "Failed to create payment" });
  }
 });

 // ✅ Complete Job (with payment check)
 router.post("/completeJob/:jobId", async (req, res) => {
  try {
  const jobId = req.params.jobId;

  const payment = await Payment.findOne({ jobId: jobId });

  if (!payment) {
  return res.status(400).json({ error: "No payment found for this job" });
  }

  if (payment.paymentStatus !== "Completed") {
  return res.status(400).json({ error: "Payment is not completed" });
  }

  // Update job status to "Completed"
  const updatedJob = await Job.findByIdAndUpdate(
  jobId,
  { status: "Completed", completedAt: new Date() },
  { new: true }
  );

  if (!updatedJob) {
  return res.status(404).json({ error: "Job not found" });
  }

  res.status(200).json({ message: "Job marked as completed", job: updatedJob });
  } catch (error) {
  console.error("Error completing job:", error);
  res.status(500).json({ error: "Failed to complete job" });
  }
 });

router.get("/getOpenJobsWithBidCount", async (req, res) => {
  try {
    const jobs = await Job.aggregate([
      {
        $match: { status: "Open" }, // Assuming you have a 'status' field for jobs
      },
      {
        $lookup: {
          from: "bids", // The name of your bids collection
          localField: "_id",
          foreignField: "jobId",
          as: "bids",
        },
      },
      {
        $addFields: {
          bidCount: { $size: "$bids" },
        },
      },
      {
        $project: {
          bids: 0, // Exclude the full bids array from the result
        },
      },
    ]).sort({ createdAt: -1 });

    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching open jobs with bid count:", error);
    res.status(500).json({ error: "Failed to fetch open jobs" });
  }
});
// POST to get open jobs for a provider based on their categories
router.post("/getOpenJobsForProvider", async (req, res) => {
  try {
    const db = getDB();
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: "No categories provided." });
    }

    const openJobs = await db.collection("jobs").find({
      status: "Open",
      category: { $in: categories },
    }).toArray();

    res.json(openJobs.length > 0 ? openJobs : []); // Consistent empty array return
  } catch (error) {
    console.error("Error fetching open jobs for provider:", error);
    res.status(500).json({ error: "Server error" });
  }
});


//

// POST to submit a bid
router.post("/submitBid", async (req, res) => {
  try {
    const db = getDB();
    const { jobId, providerId, amount, description } = req.body;

    // Validate ObjectId format
    if (!ObjectId.isValid(jobId) || !ObjectId.isValid(providerId)) {
      return res.status(400).json({ error: "Invalid Job ID or Provider ID format." });
    }

    const jobExists = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });
    const providerExists = await db.collection("users").findOne({ _id: new ObjectId(providerId) });

    if (!jobExists || !providerExists) {
      return res.status(404).json({ error: "Job or Provider not found." });
    }

    const newBid = new Bid({
      jobId: jobId,
      providerId: providerId,
      amount: parseFloat(amount),
      description: description,
    });

    const savedBid = await newBid.save();
    res.status(201).json(savedBid);
  } catch (error) {
    console.error("Error submitting bid:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/getAllJobs', async (req, res) => {
  console.log("Request received for /api/getAllJobs"); // Log when the endpoint is hit
  try {
    // Find all jobs in the database
    // Sort by creation date, newest first (optional, but often useful)
    const jobs = await Job.find({}).sort({ createdAt: -1 });

    // Optional: Populate referenced fields if needed later
    // const jobs = await Job.find({})
    //   .populate('categoryId', 'categoryName') // Example: get category name
    //   .populate('seekerId', 'firstName lastName email') // Example: get seeker details
    //   .sort({ createdAt: -1 });

    console.log(`Found ${jobs.length} jobs.`); // Log the number of jobs found
    res.status(200).json(jobs); // Send the array of jobs as JSON

  } catch (error) {
    console.error("Error fetching all jobs:", error); // Log the detailed error
    res.status(500).json({ message: "Error fetching jobs from database", error: error.message }); // Send a generic server error
  }
});



// ✅ Add Bid
router.post("/addBid", async (req, res) => {
  try {
    const { jobId, providerId, amount, seekerId } = req.body;
    console.log("Received bid request with data:", { jobId, providerId, amount, seekerId });

    if (!jobId || !providerId || !amount || !seekerId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // First get the job to verify it exists and get the seeker's MongoDB ID
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Only look up the provider's MongoDB ID using their Clerk ID
    console.log("Looking up provider with Clerk ID:", providerId);
    const provider = await fetchUserByClerkIdFromDB(providerId);
    console.log("Provider lookup result:", provider);

    if (!provider) {
      console.log("Provider lookup failed");
      return res.status(404).json({ error: "User not found" });
    }

    // Create bid using MongoDB ObjectIds
    const bid = new Bid({
      jobId: new ObjectId(jobId),
      providerId: provider._id,
      amount: parseFloat(amount),
      seekerId: job.seekerId, // Use the seekerId from the job document
      createdAt: new Date(),
    });

    await bid.save();

    // Create notification for the seeker
    const notification = new Notification({
      userId: job.seekerId, // Use the seekerId from the job document
      type: 'bid', // Use 'bid' instead of 'NEW_BID' to match the enum
      title: `New Bid for ${job.title}`, // Add required title field
      message: `New bid of $${amount} received for job: ${job.title}`,
      read: false,
      data: {
        jobId: jobId,
        bidAmount: amount
      },
      createdAt: new Date()
    });
    await notification.save();

    const io = req.app.get("io");
    // Emit both bid and notification events
    io.emit("bidAdded", { jobId });
    io.emit("notification", { userId: job.seekerId });

    res.status(201).json(bid);
  } catch (error) {
    console.error("Error in /addBid:", error);
    res.status(500).json({ error: "Failed to create bid" });
  }
});

router.get("/getBids/:jobId", async (req, res) => {
  try {
    const bids = await Bid.find({ jobId: req.params.jobId })
      .populate('providerId', 'firstName lastName profilePicture bio')
      .sort({ createdAt: -1 });
    res.status(200).json(bids);
  } catch (err) {
    console.error("Error in /getBids/:jobId (with populate):", err);
    res.status(500).json({ error: "Failed to fetch bids with provider details" });
  }
});

// New endpoint for fetching simple bid counts for job cards (no populate)
router.get("/getSimpleBids/:jobId", async (req, res) => {
  try {
    const bids = await Bid.find({ jobId: req.params.jobId }).sort({ createdAt: -1 });
    res.status(200).json(bids);
  } catch (err) {
    console.error("Error in /getSimpleBids/:jobId:", err);
    res.status(500).json({ error: "Failed to fetch simple bids" });
  }
});


router.get("/getBid/:id", async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) return res.status(404).json({ error: "Bid not found" });
    res.status(200).json(bid);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/addProvider", upload.single("profilePicture"), async (req, res) => {
console.log("Backend Received Request Body:", req.body);
  try {
    const {
      clerkId,
      firstName,
      lastName,
      email,
      phoneNumber,
      bio,
      birthday,
      baseLocation,
      category, // Changed from selectedCategories
      ...attributes // Capture all other attributes dynamically
    } = req.body;
    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;
    const db = getDB();

    if (!clerkId || !email || !category) { // Category is now required
      return res.status(400).json({ error: "Clerk ID, email, and category are required." });
    }

    const attributeData = {};
    for (const key in attributes) {
      if (key.startsWith('attributes[')) {
        const attributeName = key.substring('attributes['.length, key.length - 1);
        attributeData[attributeName] = attributes[key];
      }
    }
    const parsedBaseLocation = baseLocation ? {
          lat: parseFloat(baseLocation.lat || NaN),
          lng: parseFloat(baseLocation.lng || NaN)
        } : undefined;

    const newUser = {
      clerkId,
      firstName,
      lastName,
      email,
      phoneNumber,
      bio,
      profilePicture,
      userType: "Provider",
      createdAt: new Date(),
      updatedAt: new Date(),
      providerAttributes: {
              birthday: birthday ? new Date(birthday) : undefined,
              baseLocation: parsedBaseLocation,
              selectedCategories: [{
                categoryId: category,
                attributes: attributes, // Use the 'attributes' object directly
              }],
            },
          };

    await db.collection("users").insertOne(newUser);

    res.status(201).json({ message: "Provider created successfully." });

  } catch (error) {
    console.error("Error adding provider:", error);
    res.status(500).json({ error: "Failed to create provider." });
  }
});

//router.get("/getCategories", async (req, res) => {
//  try {
//    const db = getDB();
//    const categories = await db.collection("categories").find().toArray();
//    res.json(categories);
//  } catch (error) {
//    console.error("Error fetching categories:", error);
//    res.status(500).json({ error: "Failed to fetch categories." });
//  }
//});



// ✅ Add Payment
router.post("/addPayment", async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.get("/getPayments", async (req, res) => {
  try {
    const { jobId } = req.query;
    const filter = jobId ? { jobId } : {};
    const payments = await Payment.find(filter);
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/getPayment/:id", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ Add Category
router.post("/addCategory", async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.get("/getCategories", async (req, res) => {
  try {
    const db = getDB();
    const categories = await db.collection("categories").find({}).toArray();
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Error fetching categories" });
  }
});

router.get("/getCategory/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ Add Address
router.post("/addAddress", async (req, res) => {
  try {
    const address = new Address(req.body);
    await address.save();
    res.status(201).json(address);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.get("/getAddresses", async (req, res) => {
  try {
    const addresses = await Address.find();
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/getAddress/:id", async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address) return res.status(404).json({ error: "Address not found" });
    res.status(200).json(address);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ✅ Add Rating
router.post("/addRating", async (req, res) => {
  try {
    const rating = new Rating(req.body);
    await rating.save();
    res.status(201).json(rating);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/getRatings", async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};
    const ratings = await Rating.find(filter);
    res.status(200).json(ratings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/getRating/:id", async (req, res) => {
  try {
    const rating = await Rating.findById(req.params.id);
    if (!rating) return res.status(404).json({ error: "Rating not found" });
    res.status(200).json(rating);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notifications for a user
router.get("/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Error fetching notifications" });
  }
});

// Mark notification as read
router.put("/notifications/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndUpdate(notificationId, { read: true });
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Error updating notification" });
  }
});

// Add endpoint for updating job status
router.put("/jobs/:jobId/status", async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findByIdAndUpdate(
      req.params.jobId,
      { status },
      { new: true }
    );

    // Create notifications for both seeker and provider
    if (job.providerId) {
      const providerNotification = new Notification({
        userId: job.providerId,
        type: "job",
        title: "Job Status Updated",
        message: `Job "${job.title}" status changed to ${status}`,
        read: false,
        createdAt: new Date()
      });
      await providerNotification.save();

      const io = req.app.get("io");
      io.emit("notification", {
        userId: job.providerId,
        notification: {
          type: "job",
          title: "Job Status Updated",
          message: `Job "${job.title}" status changed to ${status}`,
          jobId: job._id
        }
      });
    }

    const seekerNotification = new Notification({
      userId: job.seekerId,
      type: "job",
      title: "Job Status Updated",
      message: `Your job "${job.title}" status changed to ${status}`,
      read: false,
      createdAt: new Date()
    });
    await seekerNotification.save();

    const io = req.app.get("io");
    io.emit("notification", {
      userId: job.seekerId,
      notification: {
        type: "job",
        title: "Job Status Updated",
        message: `Your job "${job.title}" status changed to ${status}`,
        jobId: job._id
      }
    });

    res.json(job);
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read for a user
router.patch("/notifications/:userId/read-all", async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Error updating notifications" });
  }
});

// Get all categories
router.get("/getCategories", async (req, res) => {
  try {
    const db = getDB();
    const categories = await db.collection("categories").find({}).toArray();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Error fetching categories" });
  }
});

// Get all open jobs
router.get("/getJobs", async (req, res) => {
  try {
    const db = getDB();
    const jobs = await db.collection("jobs")
      .find({ status: "Open" })
      .toArray();
    
    // Get category names for each job
    const jobsWithCategories = await Promise.all(jobs.map(async (job) => {
      const category = await db.collection("categories").findOne({ _id: new ObjectId(job.categoryId) });
      return {
        ...job,
        categoryName: category?.categoryName || "Unknown Category"
      };
    }));

    res.json(jobsWithCategories);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Error fetching jobs" });
  }
});

// Calculate match score between job and provider
router.get("/calculateMatchScore/:jobId/:providerId", async (req, res) => {
  try {
    const { jobId, providerId } = req.params;
    const db = getDB();

    // Get job and provider details
    const job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });
    const provider = await db.collection("users").findOne({ _id: new ObjectId(providerId) });

    if (!job || !provider) {
      return res.status(404).json({ error: "Job or provider not found" });
    }

    let score = 0;
    const maxScore = 100;
    let currentScore = 0;

    // 1. Category Match (30 points)
    if (job.categoryId === provider.categoryId) {
      currentScore += 30;
    }

    // 2. Attribute Match (40 points)
    if (job.requiredAttributes && provider.attributes) {
      const requiredAttrs = Object.entries(job.requiredAttributes);
      const providerAttrs = provider.attributes;
      
      let matchedAttrs = 0;
      requiredAttrs.forEach(([key, value]) => {
        if (providerAttrs[key] === value) {
          matchedAttrs++;
        }
      });

      currentScore += (matchedAttrs / requiredAttrs.length) * 40;
    }

    // 3. Location Proximity (30 points)
    if (job.location && provider.location) {
      const distance = calculateDistance(
        job.location.lat,
        job.location.lng,
        provider.location.lat,
        provider.location.lng
      );

      // Convert distance to score (closer = higher score)
      // Assuming 50km is the maximum distance for full points
      const maxDistance = 50;
      const distanceScore = Math.max(0, 30 * (1 - distance / maxDistance));
      currentScore += distanceScore;
    }

    // Calculate final score
    score = Math.min(maxScore, Math.round(currentScore));

    res.json({ score });
  } catch (error) {
    console.error("Error calculating match score:", error);
    res.status(500).json({ error: "Error calculating match score" });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get all bids for a specific provider
router.get("/getBidsByProvider/:providerId", async (req, res) => {
  try {
    const { providerId } = req.params;
    
    if (!ObjectId.isValid(providerId)) {
      return res.status(400).json({ error: "Invalid provider ID format" });
    }

    const bids = await Bid.find({ providerId: new ObjectId(providerId) })
      .sort({ createdAt: -1 });
    
    res.status(200).json(bids);
  } catch (error) {
    console.error("Error fetching provider bids:", error);
    res.status(500).json({ error: "Failed to fetch provider bids" });
  }
});

// Delete a bid
router.delete("/deleteBid/:jobId/:providerId", async (req, res) => {
  try {
    const { jobId, providerId } = req.params;
    
    if (!ObjectId.isValid(jobId) || !ObjectId.isValid(providerId)) {
      return res.status(400).json({ error: "Invalid Job ID or Provider ID format" });
    }

    const result = await Bid.findOneAndDelete({
      jobId: new ObjectId(jobId),
      providerId: new ObjectId(providerId)
    });

    if (!result) {
      return res.status(404).json({ error: "Bid not found" });
    }

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    io.emit("bidDeleted", result._id);

    res.status(200).json({ success: true, message: "Bid deleted successfully" });
  } catch (error) {
    console.error("Error deleting bid:", error);
    res.status(500).json({ error: "Failed to delete bid" });
  }
});

module.exports = router;
