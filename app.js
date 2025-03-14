const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const port = 3000;
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Multer setup to handle file uploads
const upload = multer({ dest: "uploads/" });

async function checkImageQuality(imagePath) {
  const metadata = await sharp(imagePath).metadata();
  if (metadata.width < 100 || metadata.height < 100) {
    throw new Error("Image resolution is too low. Minimum 100x100 required.");
  }
  if (metadata.format !== "jpeg" && metadata.format !== "png") {
    throw new Error("Invalid image format. Only JPEG and PNG are supported.");
  }
  if (metadata.size > 15 * 1024 * 1024) {
    throw new Error("File size exceeds 15MB limit.");
  }
}

app.post("/classify", upload.single("image"), async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const imagePath = req.file.path;
    await checkImageQuality(imagePath);
    const prompt =
      "Classify this e-waste image into one of these categories: repairable, sellable, recyclable, or hazardous. Prioritize in this order: 1) Sellable if the item seems functional or has valuable parts. 2) Repairable if it shows signs of minor damage that can be fixed. 3) Recyclable if the item is non-functional but contains materials that can be reused. 4) Hazardous if it contains dangerous substances like lead or mercury. Provide a brief explanation for the chosen category.";

    const imageBuffer = fs.readFileSync(imagePath);
    const response = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: req.file.mimetype,
        },
      },
    ]);

    res.json({ classification: response.text });
    fs.unlinkSync(imagePath);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
