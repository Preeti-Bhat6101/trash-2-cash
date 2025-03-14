const express = require("express");
const fileUpload = require("express-fileupload");
const sharp = require("sharp");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
const port = 3000;

// ✅ Enable express-fileupload with proper settings
app.use(fileUpload({ useTempFiles: false }));

// ✅ Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log(process.env.GOOGLE_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Ensure uploads directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

async function checkImageQuality(imagePath) {
  const metadata = await sharp(imagePath).metadata();
  if (metadata.width < 100 || metadata.height < 100) {
    throw new Error("Image resolution is too low. Minimum 100x100 required.");
  }
  if (!["jpeg", "png"].includes(metadata.format)) {
    throw new Error("Invalid image format. Only JPEG and PNG are supported.");
  }

  const stats = fs.statSync(imagePath);
  if (stats.size > 15 * 1024 * 1024) {
    throw new Error("File size exceeds 15MB limit.");
  }
}

app.post("/classify", async (req, res) => {
  try {
    console.log("Headers:", req.headers);
    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.files);

    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageFile = req.files.image;
    const imagePath = `${uploadDir}/${imageFile.name}`;

    // ✅ Save the file temporarily
    await imageFile.mv(imagePath);

    // ✅ Check image quality
    await checkImageQuality(imagePath);

    const prompt =
      "Classify this e-waste image into one of these categories: repairable, sellable, recyclable, or hazardous. Prioritize in this order: 1) Sellable if the item seems functional or has valuable parts. 2) Repairable if it shows signs of minor damage that can be fixed. 3) Recyclable if the item is non-functional but contains materials that can be reused. 4) Hazardous if it contains dangerous substances like lead or mercury. Provide a brief explanation for the chosen category.";

    // ✅ Read image and send to Gemini API
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const response = await model.generateContent({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image, mimeType: imageFile.mimetype } }
          ]
        }
      ]
    });

    console.log("Full API Response:", JSON.stringify(response, null, 2)); // Debugging

    const classification = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from AI";


    // ✅ Remove file after processing
    fs.unlinkSync(imagePath);

    res.json({ classification });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
