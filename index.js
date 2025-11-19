// server.js

const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const base64 = require("base-64");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || "3001";
const  URL = process.env.URL_BODY || "23.22.225.132"

let client;
let db;

// Connect to MongoDB
async function connectToMongo() {
  try {
    client = new MongoClient(process.env.MONGODB_URI || "mongodb+srv://ketiakahite:ketiahahite0707@customizeyourway.hfwkjdl.mongodb.net/?retryWrites=true&w=majority&appName=customizeyourway");
    await client.connect();
    db = client.db("customization");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
}

// Middleware
app.use(express.json());

// ✅ Updated CORS settings to support both local + S3 frontend
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://www.customiseyourway.com.s3-website-us-east-1.amazonaws.com"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Attach DB to req object
app.use((req, res, next) => {
  req.db = db;
  next();
});

// ==================== Auth Routes ====================

// Signup
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, username, location } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ message: "Email, password, and username are required" });
  }

  try {
    const usersCollection = req.db.collection("users");
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    await usersCollection.insertOne({
      email,
      password: base64.encode(password),
      username,
      location,
      createdAt: new Date(),
    });

    res.status(201).json({ message: "User created successfully", user: { email, username, location } });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const usersCollection = req.db.collection("users");
    const user = await usersCollection.findOne({ email: identifier });

    if (!user) return res.status(404).json({ message: "User not found" });

    const isValidPassword = base64.decode(user.password) === password;
    if (!isValidPassword) return res.status(401).json({ message: "Invalid password" });

    res.status(200).json({
      message: "Login successful",
      user: { email: user.email, username: user.username }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== Protected Route Middleware ====================
function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ error: "Unauthorized - Missing or invalid auth header" });
  }

  const base64Credentials = authHeader.split(" ")[1];
  const decoded = base64.decode(base64Credentials);
  const [email, password] = decoded.split(":");

  if (!email || !password) {
    return res.status(401).json({ error: "Unauthorized - Invalid credentials format" });
  }

  req.db.collection("users")
    .findOne({ email })
    .then(user => {
      if (!user) return res.status(401).json({ error: "Unauthorized - User not found" });

      const encodedInputPassword = base64.encode(password);
      if (user.password !== encodedInputPassword) {
        return res.status(401).json({ error: "Unauthorized - Invalid password" });
      }

      req.user = user;
      next();
    })
    .catch(err => {
      res.status(500).json({ error: "Authentication failed", details: err.message });
    });
}

// Protected route example
app.get("/api/user", basicAuth, async (req, res) => {
  try {
    const user = req.user;
    delete user.password; // hide password
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// ==================== Product Routes ====================
const productRoutes = require("./products");
app.use("/api/products", productRoutes(db));



//  Verify credentials
app.get('/verifycredentials', async (req, res) => {
  const { email, password } = req.query;
  if (!email || !password) return res.status(400).json({ message: "Missing credentials" });

  try {
    const userCollection = db.collection("users_collections");
    const encoded = base64.encode(password);
    const user = await userCollection.findOne({ email, password: encoded });
    if (user) return res.json({ valid: true });
    res.status(401).json({ valid: false });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
// Customization options
app.get('/customizationoptions', async (req, res) => {
  try {
    const options = await db.collection("product_collection_for_customized_item").find().toArray(); // changed
    res.json(options);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch options" });
  }
});

// Save design
app.post('/designdata', basicAuth, async (req, res) => {
  const data = req.body;
  try {
    const result = await db.collection("preview_collections").insertOne({ ...data, createdAt: new Date() }); // changed
    res.status(201).json({ message: "Design saved", designId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: "Error saving design" });
  }
});

// Add to cart
app.post('/addtocart', basicAuth, async (req, res) => {
  const { email, productId, quantity } = req.body;
  if (!email || !productId || !quantity) return res.status(400).json({ message: "Missing cart data" });

  try {
    await db.collection("cart_for_customized_item").insertOne({ email, productId, quantity, addedAt: new Date() }); // changed
    res.status(201).json({ message: "Item added to cart" });
  } catch (error) {
    res.status(500).json({ message: "Cart error" });
  }
});

// POST: Add bank details
app.post('/bankdetails', basicAuth, async (req, res) => {
  const {
    userId,
    bankDetailsId,
    accountHolder,
    bankName,
    accountNumber,
    accountType,
    branchCode,
    paymentReference,
    email,
    phoneNumber
  } = req.body;

  if (!email || !bankDetailsId || !accountHolder) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const collection = db.collection("user_bank_details");
    const exists = await collection.findOne({ email, bankDetailsId });
    if (exists) return res.status(409).json({ message: "Bank details already exist" });

    await collection.insertOne({
      userId,
      bankDetailsId,
      accountHolder,
      bankName,
      accountNumber,
      accountType,
      branchCode,
      paymentReference,
      email,
      phoneNumber,
      createdAt: new Date()
    });

    res.status(201).json({ message: "Bank details added" });
  } catch (error) {
    console.error("Insert error:", error);
    res.status(500).json({ message: "Failed to save bank details" });
  }
});

// GET: Get bank details by email
app.get('/bankdetails', basicAuth, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const collection = db.collection("user_bank_details");
    const bankDetails = await collection.findOne({ email });

    if (!bankDetails) return res.status(404).json({ message: "No bank details found" });
    res.json(bankDetails);
  } catch (error) {
    console.error("Get error:", error);
    res.status(500).json({ message: "Failed to fetch bank details" });
  }
});


// PUT: Update bank details by email
app.put('/bankdetails', basicAuth, async (req, res) => {
  const { email, accountHolder, phoneNumber } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required for update" });

  try {
    const collection = db.collection("user_bank_details");
    await collection.updateOne(
      { email },
      { $set: { accountHolder, phoneNumber, updatedAt: new Date() } }
    );
    res.json({ message: "Bank details updated" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update bank details" });
  }
});

// DELETE: Delete bank details by email
app.delete('/bankdetails', basicAuth, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required for delete" });

  try {
    const collection = db.collection("user_bank_details");
    await collection.deleteOne({ email });
    res.json({ message: "Bank details deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete bank details" });
  }
});


// Update user profile
app.put('/updateprofile', basicAuth, async (req, res) => {
  const { email, name, phone } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    await db.collection("users_collections").updateOne( // changed
      { email },
      { $set: { name, phone, updatedAt: new Date() } }
     );
    res.json({ message: "Profile updated" });
  } catch (error) {
    res.status(500).json({ message: "Profile update error" });
  }
});

// Add user location
app.post("/location", async (req, res) => {
  try {
    const {
      locationId, userId, email, name, surname,
      address, city, postalCode, provinceOrState, country
    } = req.body;

    if (!locationId || !userId || !email || !name) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const collection = db.collection("user_location");
    const result = await collection.insertOne({
      locationId,
      userId,
      email,
      name,
      surname,
      address,
      city,
      postalCode,
      provinceOrState,
      country,
      createdAt: new Date()
    });

    res.status(201).json({
      message: "Location posted successfully",
      locationId: result.insertedId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get user location by email
app.get("/location", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const collection = db.collection("user_location");
    const location = await collection.findOne({ email });
    if (!location) return res.status(404).json({ message: "Location not found" });
    res.json(location);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete user location
app.delete("/location", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const collection = db.collection("user_location");
    const result = await collection.deleteOne({ email });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No location found to delete" });
    }

    res.json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Empty endpoints (fill later)
app.post('/verifybankdetails', (req, res) => {});
app.post('/cart', (req, res) => {});
app.post('/trackorderstatus', (req, res) => {});
app.post('/confirmorder', (req, res) => {});

// Delete user profile
app.delete('/userprofile', basicAuth, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    await db.collection("users_collections").deleteOne({ email }); // changed
    res.json({ message: "User profile deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete error" });
  }
});

// Update user location
app.put("/location", async (req, res) => {
  const {
    email,
    locationId,
    userId,
    name,
    surname,
    address,
    city,
    postalCode,
    provinceOrState,
    country
  } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const collection = db.collection("user_location");

    const result = await collection.updateOne(
      { email },
      {
        $set: {
          locationId,
          userId,
          name,
          surname,
          address,
          city,
          postalCode,
          provinceOrState,
          country,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "No user location found to update" });
    }

    res.json({ message: "User location updated successfully" });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// POST: Add pre-made design product
app.post('/premadeproducts', basicAuth, async (req, res) => {
  const {
    productId,
    userId,
    orderId,
    item,
    itemSize,
    color,
    designType,
    quantity,
    itemPrice,
    total,
    email
  } = req.body;

  if (!email || !productId || !item) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const collection = db.collection("product_collection_for_pre-made/not customized item");
    const exists = await collection.findOne({ email, productId });
    if (exists) return res.status(409).json({ message: "Product already exists" });

    await collection.insertOne({
      productId,
      userId,
      orderId,
      item,
      itemSize,
      color,
      designType,
      quantity,
      itemPrice,
      total,
      orderDate: new Date(),
      email,
      createdAt: new Date()
    });

    res.status(201).json({ message: "Pre-made product added" });
  } catch (error) {
    console.error("Insert error:", error);
    res.status(500).json({ message: "Failed to save product" });
  }
});

// GET: Get pre-made product by email
app.get('/premadeproducts', basicAuth, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const collection = db.collection("product_collection_for_pre-made/not customized item");
    const products = await collection.find({ email }).toArray();

    if (!products.length) return res.status(404).json({ message: "No products found" });
    res.json(products);
  } catch (error) {
    console.error("Get error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// PUT: Update product by email and productId
app.put('/premadeproducts', basicAuth, async (req, res) => {
  const { email, productId, quantity, itemPrice, total } = req.body;
  if (!email || !productId) return res.status(400).json({ message: "Email and productId required for update" });

  try {
    const collection = db.collection("product_collection_for_pre-made/not customized item");
    await collection.updateOne(
      { email, productId },
      { $set: { quantity, itemPrice, total, updatedAt: new Date() } }
    );
    res.json({ message: "Product updated" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
});

// DELETE: Delete product by email and productId
app.delete('/premadeproducts', basicAuth, async (req, res) => {
  const { email, productId } = req.body;
  if (!email || !productId) return res.status(400).json({ message: "Email and productId required for delete" });

  try {
    const collection = db.collection("product_collection_for_pre-made/not customized item");
    await collection.deleteOne({ email, productId });
    res.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

// POST: Add customized product
app.post('/customproducts', basicAuth, async (req, res) => {
  const {
    productId,
    userId,
    orderId,
    type,
    color,
    itemSize,
    quantity,
    itemPrice,
    designOptions,
    customizationPrice,
    totalPrice,
    email
  } = req.body;

  if (!email || !productId || !type) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const collection = db.collection("product_collection_for_customized_item");
    const exists = await collection.findOne({ email, productId });
    if (exists) return res.status(409).json({ message: "Product already exists" });

    await collection.insertOne({
      productId,
      userId,
      orderId,
      type,
      color,
      itemSize,
      quantity,
      itemPrice,
      designOptions,
      customizationPrice,
      totalPrice,
      email,
      orderDate: new Date(),
      createdAt: new Date()
    });

    res.status(201).json({ message: "Customized product added" });
  } catch (error) {
    console.error("Insert error:", error);
    res.status(500).json({ message: "Failed to save product" });
  }
});

// GET: Get customized products by email
app.get('/customproducts', basicAuth, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const collection = db.collection("product_collection_for_customized_item");
    const products = await collection.find({ email }).toArray();

    if (!products.length) return res.status(404).json({ message: "No products found" });
    res.json(products);
  } catch (error) {
    console.error("Get error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// PUT: Update customized product
app.put('/customproducts', basicAuth, async (req, res) => {
  const { email, productId, quantity, itemPrice, customizationPrice, totalPrice } = req.body;
  if (!email || !productId) return res.status(400).json({ message: "Email and productId required for update" });

  try {
    const collection = db.collection("product_collection_for_customized_item");
    const result = await collection.updateOne(
      { email, productId },
      { $set: { quantity, itemPrice, customizationPrice, totalPrice, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Customized product not found" });
    }

    res.json({ message: "Customized product updated" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
});

// DELETE: Delete customized product
app.delete('/customproducts', basicAuth, async (req, res) => {
  const { email, productId } = req.body;
  if (!email || !productId) return res.status(400).json({ message: "Email and productId required for delete" });

  try {
    const collection = db.collection("product_collection_for_customized_item");
    const result = await collection.deleteOne({ email, productId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Customized product not found" });
    }

    res.json({ message: "Customized product deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

// POST: Add a new preview
app.post('/previews', basicAuth, async (req, res) => {
  const { previewId, orderId, imageUrl } = req.body;

  if (!previewId || !orderId || !imageUrl) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const collection = db.collection("preview_collections");
    const exists = await collection.findOne({ previewId });
    if (exists) return res.status(409).json({ message: "Preview already exists" });

    await collection.insertOne({
      previewId,
      orderId,
      imageUrl,
      createdAt: new Date()
    });

    res.status(201).json({ message: "Preview added" });
  } catch (error) {
    console.error("Insert error:", error);
    res.status(500).json({ message: "Failed to save preview" });
  }
});

// GET: Get preview(s) by previewId or all if none provided
app.get('/previews', basicAuth, async (req, res) => {
  const { previewId } = req.query;

  try {
    const collection = db.collection("preview_collections");
    let previews;
    if (previewId) {
      previews = await collection.find({ previewId }).toArray();
    } else {
      previews = await collection.find().toArray();
    }

    if (!previews.length) return res.status(404).json({ message: "No previews found" });
    res.json(previews);
  } catch (error) {
    console.error("Get error:", error);
    res.status(500).json({ message: "Failed to fetch previews" });
  }
});

// PUT: Update a preview by previewId
app.put('/previews', basicAuth, async (req, res) => {
  const { previewId, orderId, imageUrl } = req.body;
  if (!previewId) return res.status(400).json({ message: "previewId is required for update" });

  try {
    const collection = db.collection("preview_collections");
    const result = await collection.updateOne(
      { previewId },
      { $set: { orderId, imageUrl, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Preview not found" });
    }

    res.json({ message: "Preview updated" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update preview" });
  }
});

// DELETE: Delete a preview by previewId
app.delete('/previews', basicAuth, async (req, res) => {
  const { previewId } = req.body;
  if (!previewId) return res.status(400).json({ message: "previewId is required for delete" });

  try {
    const collection = db.collection("preview_collections");
    const result = await collection.deleteOne({ previewId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Preview not found" });
    }

    res.json({ message: "Preview deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete preview" });
  }
});

// POST: Add a new order
app.post('/orders', basicAuth, async (req, res) => {
  const { orderId, userId, fullName, email, orderDate, status, totalPrice } = req.body;

  if (!orderId || !userId || !fullName || !email || !orderDate || !status || !totalPrice) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const collection = db.collection("order_collections");
    const exists = await collection.findOne({ orderId });
    if (exists) return res.status(409).json({ message: "Order already exists" });

    await collection.insertOne({
      orderId,
      userId,
      fullName,
      email,
      orderDate: new Date(orderDate),
      status,
      totalPrice,
      createdAt: new Date()
    });

    res.status(201).json({ message: "Order added" });
  } catch (error) {
    console.error("Insert error:", error);
    res.status(500).json({ message: "Failed to save order" });
  }
});

// GET: Get orders by email or all if none provided
app.get('/orders', basicAuth, async (req, res) => {
  const { email } = req.query;

  try {
    const collection = db.collection("order_collections");
    let orders;
    if (email) {
      orders = await collection.find({ email }).toArray();
    } else {
      orders = await collection.find().toArray();
    }

    if (!orders.length) return res.status(404).json({ message: "No orders found" });
    res.json(orders);
  } catch (error) {
    console.error("Get error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// PUT: Update an order by orderId
app.put('/orders', basicAuth, async (req, res) => {
  const { orderId, userId, fullName, email, orderDate, status, totalPrice } = req.body;
  if (!orderId) return res.status(400).json({ message: "orderId is required for update" });

  try {
    const collection = db.collection("order_collections");
    const result = await collection.updateOne(
      { orderId },
      { $set: { userId, fullName, email, orderDate: new Date(orderDate), status, totalPrice, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order updated" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update order" });
  }
});

// DELETE: Delete an order by orderId
app.delete('/orders', basicAuth, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ message: "orderId is required for delete" });

  try {
    const collection = db.collection("order_collections");
    const result = await collection.deleteOne({ orderId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

// Export app for testing if needed
module.exports = app;


// POST: Add item to cart
app.post('/cartitems', basicAuth, async (req, res) => {
  const {
    cartId,
    productId,
    userId,
    type,
    itemSize,
    color,
    designType,
    quantity,
    itemPrice,
    total
  } = req.body;

  if (!cartId || !productId || !userId || !type) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const collection = db.collection("cart_for_pre-made_customized_item");
    const exists = await collection.findOne({ cartId, productId });
    if (exists) return res.status(409).json({ message: "Cart item already exists" });

    await collection.insertOne({
      cartId,
      productId,
      userId,
      type,
      itemSize,
      color,
      designType,
      quantity,
      itemPrice,
      total,
      createdAt: new Date()
    });

    res.status(201).json({ message: "Cart item added" });
  } catch (error) {
    console.error("Insert error:", error);
    res.status(500).json({ message: "Failed to save cart item" });
  }
});

// GET: Get cart items by userId or cartId
app.get('/cartitems', basicAuth, async (req, res) => {
  const { userId, cartId } = req.query;

  if (!userId && !cartId) {
    return res.status(400).json({ message: "userId or cartId is required" });
  }

  try {
    const collection = db.collection("cart_for_pre-made_customized_item");
    const query = userId ? { userId } : { cartId };
    const items = await collection.find(query).toArray();

    if (!items.length) return res.status(404).json({ message: "No cart items found" });
    res.json(items);
  } catch (error) {
    console.error("Get error:", error);
    res.status(500).json({ message: "Failed to fetch cart items" });
  }
});

// PUT: Update cart item by cartId and productId
app.put('/cartitems', basicAuth, async (req, res) => {
  const {
    cartId,
    productId,
    quantity,
    itemPrice,
    total,
    type,
    itemSize,
    color,
    designType
  } = req.body;

  if (!cartId || !productId) {
    return res.status(400).json({ message: "cartId and productId required for update" });
  }

  try {
    const collection = db.collection("cart_for_pre-made_customized_item");
    const result = await collection.updateOne(
      { cartId, productId },
      { $set: { quantity, itemPrice, total, type, itemSize, color, designType, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Cart item updated" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update cart item" });
  }
});

// DELETE: Delete cart item by cartId and productId
app.delete('/cartitems', basicAuth, async (req, res) => {
  const { cartId, productId } = req.body;

  if (!cartId || !productId) {
    return res.status(400).json({ message: "cartId and productId required for delete" });
  }

  try {
    const collection = db.collection("cart_for_pre-made_customized_item");
    const result = await collection.deleteOne({ cartId, productId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Cart item deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete cart item" });
  }
});

// POST: Add item to customized cart
app.post('/customizedcart', basicAuth, async (req, res) => {
  const {
    orderId,
    productId,
    userId,
    type,
    color,
    itemSize,
    quantity,
    itemPrice,
    designOptions,
    customizationPrice,
    totalPrice
  } = req.body;

  if (!orderId || !productId || !userId || !type) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const collection = db.collection("cart_for_customized_item");
    const exists = await collection.findOne({ orderId, productId });
    if (exists) return res.status(409).json({ message: "Cart item already exists" });

    await collection.insertOne({
      orderId,
      productId,
      userId,
      type,
      color,
      itemSize,
      quantity,
      itemPrice,
      designOptions,
      customizationPrice,
      totalPrice,
      createdAt: new Date()
    });

    res.status(201).json({ message: "Customized cart item added" });
  } catch (error) {
    console.error("Insert error:", error);
    res.status(500).json({ message: "Failed to save cart item" });
  }
});

// GET: Get customized cart items by orderId or userId
app.get('/customizedcart', basicAuth, async (req, res) => {
  const { orderId, userId } = req.query;

  if (!orderId && !userId) {
    return res.status(400).json({ message: "orderId or userId required" });
  }

  try {
    const collection = db.collection("cart_for_customized_item");
    const query = orderId ? { orderId } : { userId };
    const items = await collection.find(query).toArray();

    if (!items.length) return res.status(404).json({ message: "No customized cart items found" });
    res.json(items);
  } catch (error) {
    console.error("Get error:", error);
    res.status(500).json({ message: "Failed to fetch customized cart items" });
  }
});

// PUT: Update customized cart item by orderId and productId
app.put('/customizedcart', basicAuth, async (req, res) => {
  const {
    orderId,
    productId,
    quantity,
    itemPrice,
    customizationPrice,
    totalPrice,
    type,
    color,
    itemSize,
    designOptions
  } = req.body;

  if (!orderId || !productId) {
    return res.status(400).json({ message: "orderId and productId required for update" });
  }

  try {
    const collection = db.collection("cart_for_customized_item");
    const result = await collection.updateOne(
      { orderId, productId },
      { $set: { quantity, itemPrice, customizationPrice, totalPrice, type, color, itemSize, designOptions, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Customized cart item not found" });
    }

    res.json({ message: "Customized cart item updated" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update customized cart item" });
  }
});

// DELETE: Delete customized cart item by orderId and productId
app.delete('/customizedcart', basicAuth, async (req, res) => {
  const { orderId, productId } = req.body;

  if (!orderId || !productId) {
    return res.status(400).json({ message: "orderId and productId required for delete" });
  }

  try {
    const collection = db.collection("cart_for_customized_item");
    const result = await collection.deleteOne({ orderId, productId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Customized cart item not found" });
    }

    res.json({ message: "Customized cart item deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete customized cart item" });
  }
});

// Export app for testing if needed
module.exports = app;

// Startup
app.listen(PORT, async () => {
  await connectToMongo();
  console.log(`Server is running on http://${URL}:${PORT}`);
});

