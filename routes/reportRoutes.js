const express = require("express");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");

const router = express.Router();

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ➤ Monthly summary (income vs expenses)
router.get("/monthly", auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const year = new Date().getFullYear();

    const summary = await Transaction.aggregate([
      { 
        $match: { 
          user: userId,
          date: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) }
        } 
      },
      {
        $group: {
          _id: { month: { $month: "$date" }, type: "$type" },
          total: { $sum: "$amount" }
        }
      },
      {
        $group: {
          _id: "$_id.month",
          income: { $sum: { $cond: [{ $eq: ["$_id.type", "income"] }, "$total", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$_id.type", "expense"] }, "$total", 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➤ Category breakdown
router.get("/categories", auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const breakdown = await Transaction.aggregate([
      { $match: { user: userId, type: "expense" } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } }
    ]);

    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➤ Overall totals (balance)
router.get("/totals", auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const totals = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let income = 0, expense = 0;
    totals.forEach(t => {
      if (t._id === "income") income = t.total;
      if (t._id === "expense") expense = t.total;
    });

    res.json({
      income,
      expense,
      balance: income - expense
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➤ AI Financial Insights using Google Gemini
router.get("/ai-insights", auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get current month's data
    const currentMonthData = await Transaction.aggregate([
      { 
        $match: { 
          user: userId,
          date: { 
            $gte: new Date(currentYear, currentMonth - 1, 1), 
            $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59) 
          }
        } 
      },
      {
        $group: {
          _id: { category: "$category", type: "$type" },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get last 3 months for trend analysis
    const last3Months = await Transaction.aggregate([
      { 
        $match: { 
          user: userId,
          date: { 
            $gte: new Date(currentYear, currentMonth - 4, 1), 
            $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59) 
          }
        } 
      },
      {
        $group: {
          _id: { 
            month: { $month: "$date" }, 
            type: "$type" 
          },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    // Get category breakdown for current month
    const categoryBreakdown = await Transaction.aggregate([
      { 
        $match: { 
          user: userId,
          type: "expense",
          date: { 
            $gte: new Date(currentYear, currentMonth - 1, 1), 
            $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59) 
          }
        } 
      },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } }
    ]);

    // Calculate totals
    let currentMonthIncome = 0;
    let currentMonthExpenses = 0;
    let currentMonthBalance = 0;

    currentMonthData.forEach(item => {
      if (item._id.type === "income") {
        currentMonthIncome += item.total;
      } else {
        currentMonthExpenses += item.total;
      }
    });

    currentMonthBalance = currentMonthIncome - currentMonthExpenses;

    // Prepare data for AI analysis
    const financialData = {
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        income: currentMonthIncome,
        expenses: currentMonthExpenses,
        balance: currentMonthBalance,
        categoryBreakdown: categoryBreakdown,
        transactionCount: currentMonthData.reduce((sum, item) => sum + item.count, 0)
      },
      last3Months: last3Months,
      topExpenseCategories: categoryBreakdown.slice(0, 5)
    };

    // Create prompt for Gemini AI
    const prompt = `
    As a financial advisor, analyze this user's financial data for ${currentMonth}/${currentYear} and provide personalized insights and actionable suggestions.

    Financial Summary:
    - Monthly Income: $${currentMonthIncome.toFixed(2)}
    - Monthly Expenses: $${currentMonthExpenses.toFixed(2)}
    - Monthly Balance: $${currentMonthBalance.toFixed(2)}
    - Total Transactions: ${financialData.currentMonth.transactionCount}

    Top Expense Categories:
    ${categoryBreakdown.map(cat => `- ${cat._id}: $${cat.total.toFixed(2)}`).join('\n')}

    Please provide:
    1. A brief financial health assessment
    2. Key insights about spending patterns
    3. 3-5 specific, actionable suggestions to improve financial health
    4. Positive observations (if any)
    5. Areas of concern (if any)

    Keep the response concise, friendly, and actionable and less than 100 words. Focus on practical advice that this specific user can implement. Start answer like
    Based on your incomes and expences , here are some insights and suggestions for you.
    `;

    // Generate AI insights
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const aiResponse = await result.response.text();

    res.json({
      success: true,
      financialData: financialData,
      aiInsights: aiResponse,
      generatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error("AI Insights Error:", err);
    res.status(500).json({ 
      error: "Failed to generate AI insights",
      details: err.message 
    });
  }
});

module.exports = router;
