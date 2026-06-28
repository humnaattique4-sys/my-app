import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Feedback states for better UX
  const [addFeedback, setAddFeedback] = useState({ text: "", isError: false });
  const [generalFeedback, setGeneralFeedback] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = () => {
    fetch("http://localhost:5000/students")
      .then((r) => {
        if (!r.ok) throw new Error("Could not fetch students");
        return r.json();
      })
      .then((d) => setStudents(d))
      .catch((err) => showGeneralFeedback("Error loading students: " + err.message));
  };

  const showGeneralFeedback = (msg) => {
    setGeneralFeedback(msg);
    setTimeout(() => setGeneralFeedback(""), 4000);
  };

  const addStudent = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setAddFeedback({ text: "Please enter a student name.", isError: true });
      return;
    }
    
    setAddFeedback({ text: "", isError: false });
    
    fetch("http://localhost:5000/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName }),
    })
      .then((r) => {
        if (!r.ok) {
          return r.json().then((err) => {
            throw new Error(err.message || "Failed to add student");
          });
        }
        return r.json();
      })
      .then(() => {
        setStudents([...students, { name: trimmedName, attendance: [] }]);
        setName("");
        setAddFeedback({ text: "Student added successfully!", isError: false });
        setTimeout(() => setAddFeedback({ text: "", isError: false }), 3000);
      })
      .catch((err) => {
        setAddFeedback({ text: err.message, isError: true });
      });
  };

  const deleteStudent = (studentName) => {
    if (!window.confirm(`Are you sure you want to delete student "${studentName}" and all their attendance history?`)) {
      return;
    }
    
    fetch(`http://localhost:5000/students/${encodeURIComponent(studentName)}`, {
      method: "DELETE",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to delete student");
        return r.json();
      })
      .then(() => {
        setStudents(students.filter((s) => s.name !== studentName));
        showGeneralFeedback(`Deleted student "${studentName}" successfully.`);
      })
      .catch((err) => {
        showGeneralFeedback("Error deleting student: " + err.message);
      });
  };

  const markAttendance = (studentName, status) => {
    fetch("http://localhost:5000/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: studentName, status }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to mark attendance");
        return r.json();
      })
      .then(() => {
        setStudents(
          students.map((s) =>
            s.name === studentName
              ? { ...s, attendance: [...s.attendance, status] }
              : s
          )
        );
      })
      .catch((err) => {
        showGeneralFeedback("Error marking attendance: " + err.message);
      });
  };

  const askAI = () => {
    if (!aiQuestion.trim()) return;
    setLoading(true);
    setAiReply("");
    
    fetch("http://localhost:5000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: aiQuestion }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to contact backend");
        return r.json();
      })
      .then((d) => {
        setAiReply(d.reply);
        setLoading(false);
      })
      .catch((err) => {
        setAiReply("Error: " + err.message);
        setLoading(false);
      });
  };

  const getPercent = (att) => {
    if (att.length === 0) return 0;
    return Math.round(
      (att.filter((a) => a === "present").length / att.length) * 100
    );
  };

  // Compute overall average attendance
  const avgAttendance = students.length
    ? Math.round(
        students.reduce((a, s) => a + getPercent(s.attendance), 0) /
          students.length
      )
    : 0;

  // Compute total classes recorded
  const totalClasses = students.reduce((a, s) => a + s.attendance.length, 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* Header */}
      <header className="main-header">
        <div className="header-title-container">
          <h1 className="header-title" id="app-title">
            📋 Attendance Management System
          </h1>
          <p className="header-subtitle">
            Secure Database Storage & Realtime Insights
          </p>
        </div>
        <div className="gemini-badge" id="gemini-status-badge">
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#a855f7" }}></span>
          Gemini AI Integrated
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", padding: "30px 20px", boxSizing: "border-box", flex: 1 }}>
        
        {/* Toast / Global Notification */}
        {generalFeedback && (
          <div style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            padding: "12px 20px",
            borderRadius: "12px",
            marginBottom: "20px",
            fontSize: "14px",
            animation: "fadeIn 0.2s ease-in-out"
          }}>
            ⚠️ {generalFeedback}
          </div>
        )}

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card glass-panel" id="stat-students">
            <div className="stat-icon">👨‍🎓</div>
            <div className="stat-value">{students.length}</div>
            <div className="stat-label">Total Registered Students</div>
          </div>
          
          <div className={`stat-card glass-panel ${avgAttendance >= 75 ? 'green' : avgAttendance >= 50 ? 'orange' : ''}`} id="stat-avg">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{avgAttendance}%</div>
            <div className="stat-label">Average Attendance Rate</div>
          </div>

          <div className="stat-card glass-panel" id="stat-classes">
            <div className="stat-icon">📅</div>
            <div className="stat-value">{totalClasses}</div>
            <div className="stat-label">Total Logs Recorded</div>
          </div>
        </section>

        {/* Split Columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "30px", alignItems: "start" }} className="responsive-grid">
          
          <style>{`
            @media (min-width: 900px) {
              .responsive-grid {
                grid-template-columns: 1.6fr 1fr !important;
              }
            }
          `}</style>

          {/* Left Column: Student Management */}
          <section className="glass-panel" style={{ padding: "25px" }} id="students-section">
            <h2 style={{ margin: "0 0 20px", fontSize: "20px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>👨‍🎓</span> Active Students List
            </h2>
            
            {students.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
                <div style={{ fontSize: "40px", marginBottom: "15px" }}>📭</div>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>No students registered yet.</p>
                <p style={{ margin: "5px 0 0", fontSize: "13px" }}>Use the panel on the right to register your first student.</p>
              </div>
            ) : (
              <div className="students-list">
                {students.map((s, i) => {
                  const percent = getPercent(s.attendance);
                  const color = percent >= 75 ? "#10b981" : percent >= 50 ? "#f59e0b" : "#ef4444";
                  const totalLogs = s.attendance.length;
                  const presents = s.attendance.filter(a => a === "present").length;
                  
                  return (
                    <div key={i} className="student-card" id={`student-${s.name.replace(/\s+/g, '-').toLowerCase()}`}>
                      <div className="student-info">
                        <div className="student-name">
                          <span>👤</span> {s.name}
                        </div>
                        <div className="student-stats">
                          Presents: <strong>{presents}</strong> | Absents: <strong>{totalLogs - presents}</strong>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div className="progress-track">
                            <div 
                              className="progress-bar" 
                              style={{ width: `${percent}%`, background: color }}
                            ></div>
                          </div>
                          <span className="percent-badge" style={{ color }}>{percent}%</span>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button 
                          onClick={() => markAttendance(s.name, "present")}
                          className="btn-attendance present"
                          title="Mark Present"
                          id={`btn-present-${s.name.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          ✅ Present
                        </button>
                        <button 
                          onClick={() => markAttendance(s.name, "absent")}
                          className="btn-attendance absent"
                          title="Mark Absent"
                          id={`btn-absent-${s.name.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          ❌ Absent
                        </button>
                        <button
                          onClick={() => deleteStudent(s.name)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "rgba(239, 68, 68, 0.6)",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: "8px",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s"
                          }}
                          className="delete-hover"
                          title="Delete Student"
                          id={`btn-delete-${s.name.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          🗑️
                          <style>{`
                            .delete-hover:hover {
                              background: rgba(239, 68, 68, 0.1) !important;
                              color: #ef4444 !important;
                            }
                          `}</style>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right Column: Actions and AI Assistant */}
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            
            {/* Add Student Card */}
            <section className="glass-panel" style={{ padding: "25px" }} id="add-student-section">
              <h2 style={{ margin: "0 0 15px", fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
                <span>➕</span> Add New Student
              </h2>
              
              <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addStudent()}
                    placeholder="Enter student name..."
                    className="custom-input"
                    id="input-student-name"
                  />
                  <button 
                    onClick={addStudent} 
                    className="btn-primary"
                    id="btn-add-student"
                  >
                    Add Student
                  </button>
                </div>
                
                {addFeedback.text && (
                  <div style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: addFeedback.isError ? "#f87171" : "#34d399",
                    marginTop: "6px",
                    paddingLeft: "4px"
                  }} id="add-feedback-msg">
                    {addFeedback.isError ? "❌ " : "✓ "} {addFeedback.text}
                  </div>
                )}
              </div>
            </section>

            {/* Gemini AI Assistant Card */}
            <section className="glass-panel ai-section" style={{ padding: "25px" }} id="ai-assistant-section">
              <div className="ai-title-container">
                <div className="ai-icon-pulse">✨</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Ask Gemini AI</h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                    Get data insights & smart answers
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && askAI()}
                    placeholder="Ask about attendance percentage, stats..."
                    className="custom-input"
                    id="input-ai-question"
                  />
                  <button 
                    onClick={askAI} 
                    className="btn-primary btn-ai"
                    disabled={loading}
                    id="btn-ask-ai"
                  >
                    {loading ? "..." : "Ask 🚀"}
                  </button>
                </div>
                
                {loading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "13px", paddingLeft: "4px" }}>
                    <span style={{
                      display: "inline-block",
                      width: "6px",
                      height: "6px",
                      background: "var(--color-accent-pink)",
                      borderRadius: "50%",
                      animation: "pulse 1s infinite alternate"
                    }}></span>
                    Gemini is thinking...
                  </div>
                )}
                
                {aiReply && (
                  <div className="ai-reply-box" id="ai-reply-container">
                    <div className="ai-reply-header">
                      <span>🤖</span> Gemini Assistant Response:
                    </div>
                    {aiReply}
                  </div>
                )}
              </div>
            </section>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer style={{ padding: "20px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
        © {new Date().getFullYear()} Attendance Portal. Made with React, Python, and Gemini API.
      </footer>
    </div>
  );
}

export default App;