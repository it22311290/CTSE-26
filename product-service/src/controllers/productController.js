const mongoose = require("mongoose");
const { Product } = require("../models/productModel");

const productController = {
  getAll: async (req, res, next) => {
    try {
      const { category, minPrice, maxPrice, search } = req.query;
      const filter = {};
      if (category) filter.category = category;
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }
      if (search) filter.$text = { $search: search };

      const products = await Product.find(filter);
      res.json({ products, count: products.length });
    } catch (err) { next(err); }
  },

  getById: async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: "Product not found" });
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json({ product });
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const { name, description, price, stock, category } = req.body;
      if (!name || price == null || stock == null || !category)
        return res.status(400).json({ error: "name, price, stock, and category are required" });
      const product = await Product.create({
        name, description: description || "",
        price: parseFloat(price), stock: parseInt(stock), category
      });
      res.status(201).json({ message: "Product created", product });
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: "Product not found" });
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json({ message: "Product updated", product });
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: "Product not found" });
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json({ message: "Product deleted" });
    } catch (err) { next(err); }
  },

  // Called by Order Service — atomically check AND decrement stock
  checkAndReserveStock: async (req, res, next) => {
    try {
      const { productId, quantity } = req.body;
      const quantityNum = parseInt(quantity);
      if (!productId || isNaN(quantityNum) || quantityNum <= 0)
        return res.status(400).json({ error: "productId and positive integer quantity required" });

      // findOneAndUpdate with $inc is atomic in MongoDB
      const product = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: quantityNum } },   // only match if stock is sufficient
        { $inc: { stock: -quantityNum } },
        { new: true }
      );

      if (!product) {
        const exists = await Product.findById(productId);
        if (!exists) return res.status(404).json({ error: "Product not found" });
        return res.status(409).json({ error: "Insufficient stock", available: exists.stock });
      }
      res.json({ success: true, product, reserved: quantityNum });
    } catch (err) { next(err); }
  },

  restoreStock: async (req, res, next) => {
    try {
      const { productId, quantity } = req.body;
      const quantityNum = parseInt(quantity);
      if (!productId || isNaN(quantityNum) || quantityNum <= 0)
        return res.status(400).json({ error: "productId and positive integer quantity required" });
      const product = await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: quantityNum } },
        { new: true }
      );
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json({ success: true, product });
    } catch (err) { next(err); }
  }
};

module.exports = productController;
