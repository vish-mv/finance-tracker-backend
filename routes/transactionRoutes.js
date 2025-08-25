const express = require("express");
const { body, validationResult } = require("express-validator");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");

const router = express.Router();

// ➤ Add a new transaction
router.post(
  "/",
  auth,
  [
    body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense"),
    body("category").notEmpty().withMessage("Category is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { type, category, amount, date, note } = req.body;

      const transaction = new Transaction({
        type,
        category,
        amount,
        date,
        note,
        user: req.user.userId // attach logged-in user
      });

      const saved = await transaction.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ➤ Get all transactions for logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.userId })
      .sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➤ Get single transaction by ID (must belong to user)
router.get("/:id", auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➤ Update a transaction (only if belongs to user)
router.put(
  "/:id",
  auth,
  [
    body("type").optional().isIn(["income", "expense"]),
    body("amount").optional().isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const updated = await Transaction.findOneAndUpdate(
        { _id: req.params.id, user: req.user.userId },
        req.body,
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: "Transaction not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ➤ Delete a transaction (only if belongs to user)
router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });
    if (!deleted) return res.status(404).json({ error: "Transaction not found" });
    res.json({ message: "Transaction deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
