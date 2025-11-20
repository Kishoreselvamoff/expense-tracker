import sqlite3
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
DB_NAME = "expenses.db"


def init_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            type TEXT NOT NULL,         -- 'income' or 'expense'
            amount REAL NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, date, description, category, type, amount FROM transactions "
        "ORDER BY date DESC, id DESC"
    )
    rows = cur.fetchall()
    conn.close()

    data = [
        {
            "id": r[0],
            "date": r[1],
            "description": r[2],
            "category": r[3],
            "type": r[4],
            "amount": r[5],
        }
        for r in rows
    ]
    return jsonify(data)


@app.route("/api/transactions", methods=["POST"])
def add_transaction():
    payload = request.get_json()
    date = payload.get("date")
    description = payload.get("description", "").strip()
    category = payload.get("category", "").strip()
    type_ = payload.get("type", "").strip()
    amount = payload.get("amount")

    if not (date and description and category and type_ and amount):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({"error": "Invalid amount"}), 400

    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO transactions (date, description, category, type, amount)
        VALUES (?, ?, ?, ?, ?)
        """,
        (date, description, category, type_, amount),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()

    return jsonify({"id": new_id}), 201


@app.route("/api/transactions/<int:tx_id>", methods=["DELETE"])
def delete_transaction(tx_id):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
