// backend/seedProducts.js
require("dotenv").config();
const { MongoClient } = require("mongodb");

const products = [
  { name: "Phone Case", price: 20, image: "/images/phone-case.png", colors: ["black", "white"], category: "accessories", description: "Protective phone case" },
  { name: "White Hoodie", price: 60, image: "/images/white-hoodie.png", colors: ["white", "black", "grey"], category: "clothing" },
  { name: "Backpack", price: 45, image: "/images/backpack.png", colors: ["black", "navy"], category: "bags" },
  { name: "Notebook", price: 25, image: "/images/notebook.png", colors: ["white"], category: "stationery" },
  { name: "Bucket Hat", price: 35, image: "/images/bucket-hat.png", colors: ["beige", "black"], category: "accessories" },
  { name: "Sneakers", price: 70, image: "/images/sneakers.png", colors: ["white", "black"], category: "footwear" },
  { name: "Cushion", price: 2000, image: "/images/cushion.png", colors: ["cream"], category: "home" },
  { name: "Table", price: 550, image: "/images/table.png", colors: ["wood"], category: "furniture" },
  { name: "Pants", price: 90, image: "/images/pants.png", colors: ["black", "navy"], category: "clothing" }
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB || "customiseyourway";
    const db = client.db(dbName);
    const coll = db.collection("products");

    // optional: clear existing products
    await coll.deleteMany({});
    const result = await coll.insertMany(products);
    console.log(`Inserted ${result.insertedCount} products into ${dbName}.products`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
