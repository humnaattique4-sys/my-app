# Attendance Management App with Gemini AI

An attendance management system with an integrated AI chat assistant. The backend is built with **Flask** and **SQLite**, the frontend with **React**, and AI-powered chat is handled via **OpenRouter** (Gemini models).

---

## ✨ Features

- 📋 Student/employee attendance tracking (mark, view, and update records)
- 📊 Attendance summary and reporting
- 🔐 User authentication (login/signup)
- 🤖 AI chat assistant (powered by Gemini via OpenRouter) for answering attendance-related queries
- 🗄️ Lightweight SQLite database — no external DB setup required
- ⚛️ Responsive React frontend

---

## 🛠️ Tech Stack

**Frontend:** React, JavaScript, CSS
**Backend:** Flask (Python), SQLite
**AI Integration:** OpenRouter API (Gemini models)

---

## 📁 Project Structure

```
my-app/
├── backend/        # Flask API, SQLite database, AI chat integration
│   ├── app.py
│   ├── models.py
│   ├── requirements.txt
│   └── ...
├── frontend/        # React application
│   ├── src/
│   ├── package.json
│   └── ...
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+ and npm
- An OpenRouter API key ([get one here](https://openrouter.ai))

### 1. Clone the repository

```bash
git clone https://github.com/humnaattique4-sys/my-app.git
cd my-app
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside `backend/` with your API key:

```
OPENROUTER_API_KEY=your_api_key_here
```

Run the Flask server:

```bash
python app.py
```

The backend will start on `http://localhost:5000` (or the port specified in `app.py`).

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm start
```

The React app will run on `http://localhost:3000` and connect to the Flask backend.

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | API key used to authenticate requests to OpenRouter for Gemini AI chat |
| `DATABASE_URL` | (Optional) Path to the SQLite database file, defaults to a local `.db` file |

---

## 📸 Screenshots

*Add screenshots of the login page, attendance dashboard, and AI chat here.*

---

## 🧠 How the AI Chat Works

The chat feature sends user queries from the React frontend to a Flask endpoint, which forwards the request to OpenRouter's API using a Gemini model. The response is then relayed back to the frontend and displayed in the chat interface, allowing users to ask natural-language questions about their attendance data.

---

## 📌 Future Improvements

- Role-based access control (admin vs. regular user)
- Export attendance reports to PDF/Excel
- Email/SMS notifications for absentees
- Deployment guide (Docker / cloud hosting)

---

## 👩‍💻 Author

**Humna Attique**
[GitHub](https://github.com/humnaattique4-sys) · [LinkedIn](https://linkedin.com/in/humna-attique-4b3a2a335) · [Portfolio](https://humnaattique4-sys.github.io/HumnaAttique.github.io/)

---

## 📄 License

This project is for educational purposes as part of a university assignment.
