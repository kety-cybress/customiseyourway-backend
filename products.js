// products.js
const express = require('express');
const router = express.Router();

module.exports = function (db) {
  router.get('/', async (req, res) => {
    try {
      const products = await db.collection('products').find().toArray();
      res.json(products);
    } catch (err) {
      console.error('Error fetching products:', err);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  return router;
};
