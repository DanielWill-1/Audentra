import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import transcriptionRoute from "./routes/transcription";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Add transcription route
app.use(transcriptionRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
