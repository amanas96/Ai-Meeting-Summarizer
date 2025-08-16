const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware setup
app.use(cors()); // Enables Cross-Origin Resource Sharing.
app.use(express.json()); // Parses incoming JSON requests.

// --- MongoDB Database Setup ---

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not defined in the .env file.");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Successfully connected to MongoDB!"))
  .catch((err) => console.error("MongoDB connection error:", err));

const summarySchema = new mongoose.Schema({
  originalTranscript: { type: String, required: true },
  customPrompt: { type: String, required: true },
  generatedSummary: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Summary = mongoose.model("Summary", summarySchema);

// --- AI Service and API Configuration ---
// Get the Gemini API key from the environment variables.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Check if the API key is provided.
if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY is not defined in the .env file.");
  process.exit(1);
}

// --- API Routes ---

app.post("/api/summarize", async (req, res) => {
  const { transcript, prompt } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required." });
  }

  try {
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Summarize the following text based on this prompt: "${prompt}".\n\nText to summarize:\n${transcript}`,
            },
          ],
        },
      ],
      generationConfig: {
        // You can customize model settings here if needed
      },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

    // Make the API call to the Gemini API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gemini API responded with status: ${response.status}`);
    }

    const result = await response.json();
    const generatedText =
      result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!generatedText) {
      return res.status(500).json({
        error:
          "Failed to generate a summary. The AI model returned an empty response.",
      });
    }

    const newSummary = new Summary({
      originalTranscript: transcript,
      customPrompt: prompt,
      generatedSummary: generatedText,
    });
    await newSummary.save();

    res.json({ summary: generatedText, _id: newSummary._id });
  } catch (err) {
    console.error("Error in summarization process:", err);
    res.status(500).json({
      error: "Internal server error during summarization.",
      details: err.message,
    });
  }
});

app.get("/api/summaries", async (req, res) => {
  try {
    const summaries = await Summary.find().sort({ createdAt: -1 });
    res.json(summaries);
  } catch (err) {
    console.error("Error fetching summaries:", err);
    res
      .status(500)
      .json({ error: "Internal server error fetching summaries." });
  }
});

app.put("/api/summaries/:id", async (req, res) => {
  const { id } = req.params;
  const { generatedSummary } = req.body;
  try {
    const updatedSummary = await Summary.findByIdAndUpdate(
      id,
      { generatedSummary },
      { new: true, runValidators: true }
    );
    if (!updatedSummary) {
      return res.status(404).json({ error: "Summary not found." });
    }
    res.json(updatedSummary);
  } catch (err) {
    console.error("Error updating summary:", err);
    res.status(500).json({ error: "Internal server error updating summary." });
  }
});

app.delete("/api/summaries/:id", async (req, res) => {
  try {
    const summary = await Summary.findByIdAndDelete(req.params.id);
    if (!summary) {
      return res.status(404).json({ error: "Summary not found." });
    }
    res.json({ message: "Summary deleted successfully." });
  } catch (err) {
    console.error("Error deleting summary:", err);
    res.status(500).json({ error: "Internal server error deleting summary." });
  }
});

app.post("/api/share", async (req, res) => {
  const { to, subject, body } = req.body;

  // *** IMPORTANT: You need to set up an email transport service here. ***
  // Example using a Gmail account:
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    html: body,
  };

  try {
    // await transporter.sendMail(mailOptions);
    console.log(`Email sharing logic placeholder executed. Email to: ${to}`);
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({
      error: "Internal server error sending email.",
      details: err.message,
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(
    "Backend setup is complete. Now connect your frontend to these endpoints."
  );
});
