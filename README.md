# Finance Tracker Backend

A personal expenses tracking system backend built with Node.js, Express, and MongoDB.

## Features

- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Transaction Management**: Track income and expenses with categories
- **Budget Management**: Set and monitor budgets by category
- **Financial Reports**: Monthly summaries, category breakdowns, and balance calculations
- **AI Financial Insights**: Personalized financial advice using Google Gemini AI

## New Feature: AI Financial Insights

The `/api/reports/ai-insights` endpoint provides personalized financial analysis and suggestions using Google Gemini AI.

### What it analyzes:
- Current month's income vs expenses
- Spending patterns by category
- Financial health assessment
- Personalized actionable suggestions
- Areas of concern and positive observations

### Setup Required:

1. **Get Google Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

2. **Environment Variables**:
   ```bash
   # Required for AI insights
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Existing variables
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get specific transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Budgets
- `POST /api/budgets` - Create budget
- `GET /api/budgets` - Get all budgets
- `GET /api/budgets/:id` - Get budget with spending progress
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Reports
- `GET /api/reports/monthly` - Monthly income/expense summary
- `GET /api/reports/categories` - Category spending breakdown
- `GET /api/reports/totals` - Overall financial balance
- `GET /api/reports/ai-insights` - AI-powered financial insights

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with required variables
4. Start the server: `npm start` or `npm run dev`

## Dependencies

- Express.js - Web framework
- MongoDB/Mongoose - Database
- JWT - Authentication
- bcryptjs - Password hashing
- express-validator - Input validation
- @google/generative-ai - Google Gemini AI integration
- CORS - Cross-origin resource sharing
