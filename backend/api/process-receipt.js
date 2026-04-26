import multer from "multer";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { GoogleGenAI } from "@google/genai";

// Multer in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Parse JSON from environment variable
const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const PROCESSOR_ID = process.env.GOOGLE_PROCESSOR_ID;
const LOCATION = "us";

// Init clients
const docaiClient = new DocumentProcessorServiceClient({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
});
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Gemini helper
async function extractWithGemini(text) {
  const prompt = `
You are a receipt analyzer AI.
Extract and return the following fields from this receipt text:

- productName
- purchaseDate
- warrantyExpiry (if mentioned)
- storeName
- totalAmount

Return **JSON only**, no extra text, no backticks.

Receipt text:
${text}
`;
  const result = await genAI.models.generateContent({
    model : "gemini-2.5-flash",
    contents : prompt,
  });
  let jsonStr = result.text;
  jsonStr = jsonStr.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return { error: "Invalid AI response", raw: result.text};
  }
}

// Serverless function configuration
export const config = {
  api: { bodyParser: false },
};

// Main handler
export default async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).send("Server is live!");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  console.log("🚀 Processing receipt...");
  upload.single("file")(req, res, async (err) => {
    if (err || !req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    console.log("✅ File uploaded successfully");
    try {
      const fileBuffer = req.file.buffer;
      const processorName = `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`;

      // Process with Document AI
      let text;
      try {
        const [result] = await docaiClient.processDocument({
          name: processorName,
          rawDocument: {
            content: fileBuffer.toString("base64"),
            mimeType: "image/jpeg", // adjust if PDF
          },
        });
        text = result.document.text;
      } catch (docAIError) {
        console.error("❌ Document AI error:", docAIError);
        return res.status(500).json({ error: "Document AI processing failed", details: docAIError.message });
      }
      console.log("✅ Document AI processed successfully", text);
      // Extract structured data with Gemini AI
      let extracted;
      try {
        extracted = await extractWithGemini(text);
      } catch (geminiError) {
        console.error("❌ Gemini AI error:", geminiError);
        return res.status(500).json({ error: "Gemini AI extraction failed", details: geminiError.message });
      }
      console.log("✅ Gemini AI extracted successfully", extracted);
      res.status(200).json({ rawText: text, extracted });
    } catch (serverError) {
      console.error("❌ Server error:", serverError);
      res.status(500).json({ error: "Failed to process document", details: serverError.message });
    }
  });
}