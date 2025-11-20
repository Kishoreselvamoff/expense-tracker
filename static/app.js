const form = document.getElementById("transactionForm");
const statusEl = document.getElementById("status");
const tbody = document.getElementById("transactionBody");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const balanceEl = document.getElementById("balance");

let categoryChart = null;

function setStatus(msg, isError = false) {
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "#fecaca" : "#93c5fd";
}

function formatAmount(amount) {
    return "₹" + amount.toFixed(2);
}

function renderTable(transactions) {
    tbody.innerHTML = "";

    transactions.forEach((tx) => {
        const tr = document.createElement("tr");

        const dateTd = document.createElement("td");
        dateTd.textContent = tx.date;

        const descTd = document.createElement("td");
        descTd.textContent = tx.description;

        const catTd = document.createElement("td");
        catTd.textContent = tx.category;

        const typeTd = document.createElement("td");
        typeTd.textContent =
            tx.type === "income" ? "Income" : "Expense";

        const amountTd = document.createElement("td");
        amountTd.textContent = formatAmount(tx.amount);

        const actionTd = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "Delete";
        btn.className = "delete-btn";
        btn.addEventListener("click", () => deleteTransaction(tx.id));
        actionTd.appendChild(btn);

        tr.appendChild(dateTd);
        tr.appendChild(descTd);
        tr.appendChild(catTd);
        tr.appendChild(typeTd);
        tr.appendChild(amountTd);
        tr.appendChild(actionTd);

        tbody.appendChild(tr);
    });
}

function renderSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
        if (tx.type === "income") {
            totalIncome += tx.amount;
        } else {
            totalExpense += tx.amount;
        }
    }

    const balance = totalIncome - totalExpense;

    totalIncomeEl.textContent = formatAmount(totalIncome);
    totalExpenseEl.textContent = formatAmount(totalExpense);
    balanceEl.textContent = formatAmount(balance);
}

function renderCategoryChart(transactions) {
    const categoryTotals = {};

    for (const tx of transactions) {
        if (tx.type !== "expense") continue; // only expenses in chart
        const cat = tx.category || "Other";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
    }

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    const ctx = document
        .getElementById("categoryChart")
        .getContext("2d");

    if (categoryChart) {
        categoryChart.destroy();
    }

    if (labels.length === 0) {
        categoryChart = null;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    categoryChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [
                {
                    data: values,
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        font: { size: 11 },
                    },
                },
            },
        },
    });
}

async function loadTransactions() {
    try {
        const res = await fetch("/api/transactions");
        const data = await res.json();
        renderTable(data);
        renderSummary(data);
        renderCategoryChart(data);
    } catch (err) {
        console.error(err);
        setStatus("Failed to load transactions.", true);
    }
}

async function addTransaction(e) {
    e.preventDefault();
    setStatus("");

    const date = document.getElementById("date").value;
    const description = document
        .getElementById("description")
        .value.trim();
    const category = document.getElementById("category").value;
    const amountStr = document.getElementById("amount").value;
    const typeInput = document.querySelector(
        'input[name="type"]:checked'
    );
    const type = typeInput ? typeInput.value : null;

    if (!date || !description || !category || !type || !amountStr) {
        setStatus("Please fill all fields.", true);
        return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        setStatus("Amount must be a positive number.", true);
        return;
    }

    try {
        const res = await fetch("/api/transactions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                date,
                description,
                category,
                type,
                amount,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            setStatus(data.error || "Failed to add transaction.", true);
            return;
        }

        // Clear form
        form.reset();
        setStatus("Transaction added successfully.");

        // Reload list
        loadTransactions();
    } catch (err) {
        console.error(err);
        setStatus("Error adding transaction.", true);
    }
}

async function deleteTransaction(id) {
    if (!confirm("Delete this transaction?")) return;
    try {
        const res = await fetch(`/api/transactions/${id}`, {
            method: "DELETE",
        });
        if (!res.ok) {
            setStatus("Failed to delete transaction.", true);
            return;
        }
        loadTransactions();
    } catch (err) {
        console.error(err);
        setStatus("Error deleting transaction.", true);
    }
}

form.addEventListener("submit", addTransaction);
loadTransactions();
