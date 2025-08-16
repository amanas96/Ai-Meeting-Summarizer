import { useState } from "react";
import "./index.css";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [prompt, setPrompt] = useState("Summarize this text in bullet points.");
  const [summary, setSummary] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const backendUrl = "http://localhost:5000/api";

  const handleGenerateSummary = async () => {
    if (!transcript.trim()) {
      setMessage("Please enter a meeting transcript.");
      return;
    }
    setLoading(true);
    setMessage("Generating summary...");

    // Log the data being sent to the backend for debugging purposes
    console.log("Sending to backend:", { transcript, prompt });

    try {
      const response = await fetch(`${backendUrl}/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript, prompt }),
      });

      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary);
        setMessage("Summary generated successfully!");
      } else {
        setMessage(`Error: ${data.error || "Failed to generate summary."}`);
      }
    } catch (error) {
      setMessage("Network error. Please check if the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleShareSummary = async () => {
    if (!summary.trim()) {
      setMessage("There is no summary to share.");
      return;
    }
    if (!email.trim()) {
      setMessage("Please enter a recipient email address.");
      return;
    }
    setLoading(true);
    setMessage("Sharing summary via email...");

    try {
      const response = await fetch(`${backendUrl}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          subject: "AI-Generated Meeting Summary",
          body: summary,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Summary shared successfully!");
      } else {
        setMessage(`Error: ${data.error || "Failed to send email."}`);
      }
    } catch (error) {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="main-heading">AI Meeting Notes Summarizer</h1>
      <hr className="divider" />

      <div className="input-section">
        <h2 className="section-heading">1. Enter Meeting Transcript:</h2>
        <textarea
          className="text-input"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste your meeting transcript here..."
        />
      </div>

      <div className="input-section">
        <h2 className="section-heading">2. Enter Custom Prompt:</h2>
        <input
          type="text"
          className="text-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'Highlight key decisions and action items.'"
        />
      </div>

      <button
        className={`generate-btn ${loading ? "loading" : ""}`}
        onClick={handleGenerateSummary}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Summary"}
      </button>

      {message && <div className="message-box">{message}</div>}

      {summary && (
        <div className="summary-section">
          <h2 className="section-heading">3. Generated Summary (Editable):</h2>
          <textarea
            className="text-input"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            disabled={loading}
          />

          <div className="input-section">
            <h2 className="section-heading">4. Share Summary via Email:</h2>
            <input
              type="email"
              className="text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter recipient's email address"
              disabled={loading}
            />
            <button
              className={`share-btn ${loading ? "loading" : ""}`}
              onClick={handleShareSummary}
              disabled={loading}
            >
              Share via Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
