import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import transcriptionRoute from "./routes/transcription";
import ttsRoute from "./routes/tts";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

// Add transcription route
app.use("/api", transcriptionRoute);

// Add TTS route
app.use("/api", ttsRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
