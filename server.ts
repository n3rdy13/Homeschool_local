import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Safely extract a JSON block from a raw Gemini text response.
// Gemini sometimes wraps JSON in ```json ... ``` fences or adds commentary.
function extractJSON(raw: string): string {
  // Try to find a fenced code block first
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // Otherwise take the first { ... } or [ ... ] balanced block
  const firstBrace = raw.indexOf("{");
  const firstBracket = raw.indexOf("[");
  const start =
    firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)
      ? firstBrace
      : firstBracket;

  if (start === -1) return raw.trim();

  const openChar = raw[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === openChar) depth++;
    else if (raw[i] === closeChar) {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return raw.slice(start).trim();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const geminiApiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;

  if (geminiApiKey) {
    ai = new GoogleGenAI({ apiKey: geminiApiKey });
  }

  // ─────────────────────────────────────────────────
  // POST /api/generate-lesson
  // ─────────────────────────────────────────────────
  app.post("/api/generate-lesson", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({
          error:
            "GEMINI_API_KEY is not configured. Please add it to the project Secrets (environment variables).",
        });
      }

      const { subject, topic, gradeLevel, type } = req.body as {
        subject: string;
        topic: string;
        gradeLevel: string;
        type: "standard" | "remedial" | "advanced";
      };

      if (!subject || !topic || !gradeLevel || !type) {
        return res.status(400).json({ error: "Missing required fields: subject, topic, gradeLevel, type" });
      }

      const difficultyNote =
        type === "remedial"
          ? "Use simplified vocabulary, extra visual analogies, and step-by-step scaffolding. This is a reinforcement lesson for a student who struggled previously."
          : type === "advanced"
          ? "Challenge the student with deeper analysis, higher-order thinking questions, and complex application problems."
          : "Use age-appropriate vocabulary and standard curriculum pacing.";

      const prompt = `You are a master homeschool curriculum designer. Create a complete, structured lesson package for a ${gradeLevel} student.

Subject: ${subject}
Topic: ${topic}
Lesson Type: ${type}
Difficulty Note: ${difficultyNote}

Return ONLY a valid JSON object with exactly this structure (no extra text, no markdown fences):
{
  "teacher_guide": "string — 2–3 paragraphs: learning objectives, teaching strategy, common misconceptions to watch for",
  "lesson_plan": "string — a pacing timeline (e.g. 5 min intro, 15 min reading, 10 min worksheet, 5 min review)",
  "reading_material": "string — 300–500 words of engaging, age-appropriate reading content on the topic",
  "worksheet": [
    {
      "question": "string",
      "type": "multiple_choice",
      "options": ["string", "string", "string", "string"],
      "answer": "string — the exact option text that is correct"
    },
    {
      "question": "string",
      "type": "short_answer",
      "options": [],
      "answer": "string — model answer or rubric"
    }
  ],
  "homework": "string — 2–3 independent study tasks the student can do without the teacher"
}

Rules:
- Include exactly 4–6 worksheet questions mixing multiple_choice and short_answer types.
- Every multiple_choice question must have exactly 4 options.
- The "answer" field for multiple_choice must exactly match one of the options strings.
- Return only raw JSON with no commentary.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.4 },
      });

      const rawText = response.text ?? "";
      if (!rawText.trim()) {
        return res.status(502).json({ error: "Gemini returned an empty response. Please try again." });
      }

      let lessonData: any;
      try {
        lessonData = JSON.parse(extractJSON(rawText));
      } catch {
        console.error("Failed to parse lesson JSON. Raw response:\n", rawText);
        return res.status(502).json({
          error: "Gemini response could not be parsed as JSON. Please try again.",
        });
      }

      // Validate core fields are present
      const required = ["teacher_guide", "lesson_plan", "reading_material", "worksheet", "homework"];
      for (const field of required) {
        if (!lessonData[field]) {
          return res.status(502).json({ error: `Gemini response is missing the "${field}" field.` });
        }
      }

      res.json(lessonData);
    } catch (error: any) {
      console.error("Generate Lesson Error:", error);
      res.status(500).json({ error: error.message || "Lesson generation failed." });
    }
  });

  // ─────────────────────────────────────────────────
  // POST /api/grade-answers
  // ─────────────────────────────────────────────────
  app.post("/api/grade-answers", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const { worksheet, answers } = req.body as {
        worksheet: Array<{
          question: string;
          type: string;
          options: string[];
          answer: string;
        }>;
        answers: Record<number, string>;
      };

      if (!worksheet || !answers) {
        return res.status(400).json({ error: "Missing worksheet or answers." });
      }

      const gradingItems = worksheet.map((q, i) => ({
        index: i,
        question: q.question,
        type: q.type,
        correctAnswer: q.answer,
        studentAnswer: answers[i] ?? "(no answer)",
      }));

      const prompt = `You are a fair and encouraging homeschool grader. Grade the following worksheet answers and return a JSON array.

${JSON.stringify(gradingItems, null, 2)}

For each item return:
{
  "index": number,
  "isCorrect": boolean,
  "score": number (0–10),
  "feedback": "string — one sentence of constructive feedback"
}

Rules:
- For multiple_choice: isCorrect is true only if the student's answer matches the correct answer exactly (case-insensitive).
- For short_answer/essay: use semantic meaning — partial credit is allowed (score 1–9).
- Be encouraging, never harsh.
- Return ONLY a JSON array, no extra text.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 },
      });

      const rawText = response.text ?? "";
      if (!rawText.trim()) {
        return res.status(502).json({ error: "Gemini returned an empty grading response." });
      }

      let grades: any[];
      try {
        grades = JSON.parse(extractJSON(rawText));
        if (!Array.isArray(grades)) throw new Error("Not an array");
      } catch {
        console.error("Failed to parse grading JSON. Raw:\n", rawText);
        return res.status(502).json({ error: "Could not parse grading response." });
      }

      res.json({ grades });
    } catch (error: any) {
      console.error("Grade Answers Error:", error);
      res.status(500).json({ error: error.message || "Grading failed." });
    }
  });

  // ─────────────────────────────────────────────────
  // POST /api/recommend-next-topic
  // ─────────────────────────────────────────────────
  app.post("/api/recommend-next-topic", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const { subject, currentTopic, score, gradeLevel, history = [] } = req.body as {
        subject: string;
        currentTopic: string;
        score: number;
        gradeLevel: string;
        history: string[];
      };

      if (!subject || !currentTopic || score === undefined) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      const prompt = `You are a homeschool curriculum sequencer. Based on performance data, recommend the next lesson topic.

Subject: ${subject}
Grade Level: ${gradeLevel}
Just completed topic: "${currentTopic}"
Score achieved: ${score}%
Topics already covered: ${history.length > 0 ? history.join(", ") : "none yet"}

Rules:
- If score < 75: recommend a remedial reinforcement of the same or closely related topic.
- If score >= 90: recommend an advanced or accelerated next topic.
- Otherwise: recommend the natural next topic in the standard curriculum sequence.
- Never repeat a topic from the already-covered list.

Return ONLY a JSON object with no extra text:
{
  "recommendedTopic": "string",
  "assessmentType": "standard" | "remedial" | "advanced",
  "rationale": "string — one sentence explaining why"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.3 },
      });

      const rawText = response.text ?? "";
      if (!rawText.trim()) {
        return res.status(502).json({ error: "Gemini returned an empty recommendation." });
      }

      let recommendation: any;
      try {
        recommendation = JSON.parse(extractJSON(rawText));
      } catch {
        console.error("Failed to parse recommendation JSON. Raw:\n", rawText);
        return res.status(502).json({ error: "Could not parse recommendation response." });
      }

      res.json(recommendation);
    } catch (error: any) {
      console.error("Recommend Next Topic Error:", error);
      res.status(500).json({ error: error.message || "Topic recommendation failed." });
    }
  });

  // ─────────────────────────────────────────────────
  // POST /api/instructor/chat  (drumming coach — legacy)
  // ─────────────────────────────────────────────────
  app.post("/api/instructor/chat", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured.",
        });
      }

      const { message, history = [] } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const formattedHistory = history.map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      const systemInstruction = `You are "Coach Dave", an elite homeschool academic tutor. You help parents and students understand lesson material, answer questions about subjects, and provide encouragement. Be warm, clear, and concise.`;

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: formattedHistory,
        config: { systemInstruction, temperature: 0.7 },
      });

      const response = await chat.sendMessage({ message });
      res.json({ reply: response.text ?? "I was unable to formulate a response." });
    } catch (error: any) {
      console.error("Chat Error:", error);
      res.status(500).json({ error: error.message || "Chat failed." });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", hasAPIKey: !!geminiApiKey });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware attached");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!geminiApiKey) {
      console.warn(
        "WARNING: GEMINI_API_KEY is not set. Add it to the .env file or project Secrets to enable lesson generation."
      );
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
