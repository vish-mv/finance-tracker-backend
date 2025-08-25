const express = require("express");
const { body, validationResult } = require("express-validator");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");

const router = express.Router();

// ➤ Add new budget
router.post(
  "/",
  auth,
  [
    body("category").notEmpty().withMessage("Category is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { category, amount, period } = req.body;

      const budget = new Budget({
        category,
        amount,
        period,
        user: req.user.userId
      });

      const saved = await budget.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ➤ Get all budgets for logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.userId });
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➤ Get budget with spending progress
router.get("/:id", auth, async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    if (!budget) return res.status(404).json({ error: "Budget not found" });

    // Calculate total spent in this category
    const spent = await Transaction.aggregate([
      { $match: { user: budget.user, category: budget.category, type: "expense" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalSpent = spent.length > 0 ? spent[0].total : 0;
    const remaining = budget.amount - totalSpent;

    res.json({
      ...budget.toObject(),
      spent: totalSpent,
      remaining
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➤ Update budget
router.put("/:id", auth, async (req, res) => {
  try {
    const updated = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Budget not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➤ Delete budget
router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });
    if (!deleted) return res.status(404).json({ error: "Budget not found" });
    res.json({ message: "Budget deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
