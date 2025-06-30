import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import transcriptionRoute from "./routes/transcription";
import ttsRoute from "./routes/tts";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

// API routes
app.use("/api", transcriptionRoute);
app.use("/api/tts", ttsRoute);

// Serve static frontend
app.use(express.static(path.join(__dirname, "../client")));
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
