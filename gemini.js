// NOTE: For a real deployment, route these calls through a Vercel serverless
// function so your Gemini API key never sits in client-side code.
// This file assumes a proxy endpoint at /api/gemini that forwards the prompt.

const GEMINI_ENDPOINT = "/api/gemini"; // serverless proxy, not called directly from browser in production

async function callGemini(systemPrompt, userInput) {
  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userInput })
  });
  const data = await res.json();
  return JSON.parse(data.text.replace(/```json|```/g, "").trim());
}

// Stage 1: financial snapshot
async function getFinancialSnapshot({ income, totalSpent, remaining, itemCategory, itemPrice }) {
  const systemPrompt = `You are a financial context analyzer. Given the user's budget data,
summarize their current financial position. Respond ONLY with JSON, no markdown, no preamble.
Shape: { "budgetHealth": "healthy"|"tight"|"over", "categoryImpact": "within limit"|"near limit"|"would exceed", "percentOfRemainingBudget": number }`;

  const userInput = JSON.stringify({ income, totalSpent, remaining, itemCategory, itemPrice });
  return callGemini(systemPrompt, userInput);
}

// Stage 2: buy/wait/skip verdict
async function getVerdictFromSnapshot(snapshot, priceHistory, currentPrice) {
  const systemPrompt = `You are a financial decision assistant. Given the financial snapshot
and price history, output a verdict. Respond ONLY with JSON, no markdown, no preamble.
Shape: { "decision": "buy"|"wait"|"skip", "confidence": "low"|"medium"|"high", "reasoning": "2-3 sentences", "priceContext": "short note on price trend" }`;

  const userInput = JSON.stringify({ ...snapshot, priceHistory, currentPrice });
  return callGemini(systemPrompt, userInput);
}

// Full pipeline used by watchlist.js
async function getVerdict(item, newPrice) {
  const budgetSummary = await refreshBudgetSummary();

  const snapshot = await getFinancialSnapshot({
    income: budgetSummary.income,
    totalSpent: budgetSummary.totalSpent,
    remaining: budgetSummary.remaining,
    itemCategory: item.category,
    itemPrice: newPrice
  });

  return getVerdictFromSnapshot(snapshot, item.priceHistory, newPrice);
}
