import google.generativeai as genai
from PIL import Image
import os
import io

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "e-waste-api.json"
genai.configure()
model = genai.GenerativeModel("gemini-2.0-flash")

def classify_e_waste(image_path):
    try:
        with Image.open(image_path) as img:
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format="PNG")  # Ensure consistent format
            img_bytes = img_byte_arr.getvalue()

        prompt = (
            "Classify this e-waste image into one of these categories: repairable, sellable, recyclable, or hazardous. Prioritize in this order: 1) Sellable if the item seems functional or has valuable parts. 2) Repairable if it shows signs of minor damage that can be fixed. 3) Recyclable if the item is non-functional but contains materials that can be reused. 4) Hazardous if it contains dangerous substances like lead or mercury. Provide a brief explanation for the chosen category."
        )

        response = model.generate_content([prompt, img])

        print("Classification Result:", response.text)
    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    image_path = "uploads/battery_93.jpg" 
    classify_e_waste(image_path)
