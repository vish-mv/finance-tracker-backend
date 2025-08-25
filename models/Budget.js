const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  category: { type: String, required: true },
  amount: { type: Number, required: true }, // total budget
  period: { type: String, enum: ["monthly", "yearly"], default: "monthly" }, // optional
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Budget", budgetSchema);
