let spendChart = null;

document.getElementById("saveIncomeBtn").addEventListener("click", () => {
  const income = Number(document.getElementById("incomeInput").value);
  if (!income || !currentUserId) return;

  db.collection("users").doc(currentUserId).set({ monthlyIncome: income }, { merge: true })
    .then(() => refreshBudgetSummary());
});

document.getElementById("addExpenseBtn").addEventListener("click", () => {
  const name = document.getElementById("expenseName").value;
  const amount = Number(document.getElementById("expenseAmount").value);
  const category = document.getElementById("expenseCategory").value;
  if (!name || !amount || !currentUserId) return;

  db.collection("users").doc(currentUserId).collection("expenses").add({
    name, amount, category,
    date: new Date().toISOString()
  }).then(() => {
    document.getElementById("expenseName").value = "";
    document.getElementById("expenseAmount").value = "";
    refreshBudgetSummary();
  });
});

// Pulls income + this month's expenses, updates the remaining budget + chart
async function refreshBudgetSummary() {
  if (!currentUserId) return;

  const userDoc = await db.collection("users").doc(currentUserId).get();
  const income = userDoc.data()?.monthlyIncome || 0;

  const expensesSnap = await db.collection("users").doc(currentUserId)
    .collection("expenses").get();

  const expenses = expensesSnap.docs.map(d => d.data());
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = income - totalSpent;

  document.getElementById("remainingBudget").textContent =
    `Remaining this month: ₹${remaining.toLocaleString()} (of ₹${income.toLocaleString()})`;

  renderSpendChart(expenses);
  return { income, totalSpent, remaining, expenses };
}

function renderSpendChart(expenses) {
  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  const ctx = document.getElementById("spendChart");
  if (spendChart) spendChart.destroy();

  spendChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(byCategory),
      datasets: [{
        data: Object.values(byCategory),
        backgroundColor: ["#2f6f4f", "#b8860b", "#5a8f72", "#c0392b", "#8fae9c"]
      }]
    },
    options: { plugins: { legend: { position: "bottom" } } }
  });
}

// Called on login (from auth.js)
function loadUserData(uid) {
  refreshBudgetSummary();
  loadWatchlist(uid);
}
