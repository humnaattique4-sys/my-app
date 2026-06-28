from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import urllib.request
import json
import os

app = Flask(__name__)
CORS(app)

# Load environment variables from .env file
def load_env():
    # Look for .env in the same directory as this script
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")

load_env()

# Database path configuration (relative to this script to prevent creating db in CWD)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY, name TEXT UNIQUE)''')
    c.execute('''CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY, student_name TEXT, status TEXT)''')
    conn.commit()
    conn.close()

init_db()

@app.route("/students", methods=["GET"])
def get_students():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT name FROM students")
    students = c.fetchall()
    result = []
    for s in students:
        c.execute("SELECT status FROM attendance WHERE student_name=?", (s[0],))
        att = [row[0] for row in c.fetchall()]
        result.append({"name": s[0], "attendance": att})
    conn.close()
    return jsonify(result)

@app.route("/students", methods=["POST"])
def add_student():
    data = request.json
    if not data or "name" not in data or not data["name"].strip():
        return jsonify({"message": "Student name is required!"}), 400
        
    student_name = data["name"].strip()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        # Check if student name already exists case-insensitively
        c.execute("SELECT name FROM students WHERE LOWER(name) = ?", (student_name.lower(),))
        existing = c.fetchone()
        if existing:
            conn.close()
            return jsonify({"message": f"Student '{student_name}' already exists!"}), 400
            
        c.execute("INSERT INTO students (name) VALUES (?)", (student_name,))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"message": f"Error adding student: {str(e)}"}), 500
    conn.close()
    return jsonify({"message": "Student added!"})

@app.route("/attendance", methods=["POST"])
def mark_attendance():
    data = request.json
    if not data or "name" not in data or "status" not in data:
        return jsonify({"message": "Name and status are required!"}), 400
        
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO attendance (student_name, status) VALUES (?, ?)", (data["name"], data["status"]))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"message": f"Error marking attendance: {str(e)}"}), 500
    conn.close()
    return jsonify({"message": "Attendance marked!"})

@app.route("/students/<string:name>", methods=["DELETE"])
def delete_student(name):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("DELETE FROM students WHERE name=?", (name,))
        c.execute("DELETE FROM attendance WHERE student_name=?", (name,))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"message": f"Error deleting student: {str(e)}"}), 500
    conn.close()
    return jsonify({"message": f"Student '{name}' and their attendance records deleted!"})


@app.route("/ask", methods=["POST"])
def ask_ai():
    data = request.json
    if not data or "question" not in data:
        return jsonify({"reply": "Error: Question is required."}), 400
        
    question = data["question"]
    
    # Dynamically reload env file to pick up any key additions without requiring server restart
    load_env()
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        return jsonify({
            "reply": "Error: GEMINI_API_KEY is not set. Please open the 'backend/.env' file, enter your Gemini/OpenRouter API key (e.g. GEMINI_API_KEY=AIzaSy... or GEMINI_API_KEY=sk-or-...), and try again."
        })
        
    # Fetch database data to provide context to Gemini AI
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("SELECT name FROM students")
        students = c.fetchall()
        student_data = []
        for s in students:
            c.execute("SELECT status FROM attendance WHERE student_name=?", (s[0],))
            att = [row[0] for row in c.fetchall()]
            student_data.append({"name": s[0], "attendance": att})
    except Exception as e:
        conn.close()
        return jsonify({"reply": f"Database Error: {str(e)}"})
    conn.close()

    # Formulate context for Gemini
    system_context = (
        "You are a helpful AI assistant for the Attendance Management System. "
        "You have direct access to the database dataset below to answer the user's questions accurately.\n\n"
        "Current Student Attendance Data:\n"
    )
    
    if not student_data:
        system_context += "- No students registered in the database yet.\n"
    else:
        for s in student_data:
            total_classes = len(s["attendance"])
            present_count = s["attendance"].count("present")
            absent_count = s["attendance"].count("absent")
            rate = round((present_count / total_classes) * 100) if total_classes > 0 else 0
            system_context += f"- Student: {s['name']} | Total Classes: {total_classes} | Presents: {present_count} | Absents: {absent_count} | Attendance Rate: {rate}%\n"

    system_context += (
        "\nUse the data above to answer the user's question. If they ask about attendance rates, counts, "
        "or specific student records, calculate or reference them directly from this data. "
        "Keep your answer clear, informative, and concise.\n\n"
        f"User Question: {question}"
    )

    if api_key.startswith("sk-or-"):
        # API Key is an OpenRouter key, route through OpenRouter with restricted max_tokens to prevent credit issues
        url = "https://openrouter.ai/api/v1/chat/completions"
        payload = json.dumps({
            "model": "google/gemini-2.5-flash",
            "messages": [{"role": "user", "content": system_context}],
            "max_tokens": 1000
        }).encode("utf-8")
        
        req = urllib.request.Request(url, data=payload, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        })
        
        try:
            with urllib.request.urlopen(req) as res:
                result = json.loads(res.read().decode("utf-8"))
                if "choices" in result and result["choices"]:
                    reply = result["choices"][0]["message"]["content"]
                else:
                    reply = "OpenRouter Gemini API returned an empty response."
                return jsonify({"reply": reply})
        except urllib.error.HTTPError as e:
            try:
                error_details = json.loads(e.read().decode("utf-8"))
                error_msg = error_details.get("error", {}).get("message", str(e))
            except Exception:
                error_msg = str(e)
            return jsonify({"reply": f"API Error: {error_msg}."})
        except Exception as e:
            return jsonify({"reply": f"Error: {str(e)}"})
    else:
        # API Key is a Google Gemini key, route directly to Google's Generative Language API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = json.dumps({
            "contents": [{
                "parts": [{"text": system_context}]
            }]
        }).encode("utf-8")
        
        req = urllib.request.Request(url, data=payload, headers={
            "Content-Type": "application/json"
        })
        
        try:
            with urllib.request.urlopen(req) as res:
                result = json.loads(res.read().decode("utf-8"))
                if "candidates" in result and result["candidates"]:
                    reply = result["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    reply = "Gemini API returned an empty response. Please verify your query or configuration."
                return jsonify({"reply": reply})
        except urllib.error.HTTPError as e:
            try:
                error_details = json.loads(e.read().decode("utf-8"))
                error_msg = error_details.get("error", {}).get("message", str(e))
            except Exception:
                error_msg = str(e)
            return jsonify({"reply": f"API Error: {error_msg}. Please check if your GEMINI_API_KEY is correct and active."})
        except Exception as e:
            return jsonify({"reply": f"Error: {str(e)}"})

if __name__ == "__main__":
    app.run(debug=True)

