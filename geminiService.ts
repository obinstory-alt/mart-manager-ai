
import { GoogleGenAI, Type } from "@google/genai";

export const analyzeMartImage = async (base64Data: string) => {
  // Use current API key from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = "Extract product name, price, and unit from this supermarket shelf or receipt image. Return as JSON.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { 
              inlineData: { 
                mimeType: "image/png", 
                data: base64Data 
              } 
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the grocery item" },
                  price: { type: Type.NUMBER, description: "Price in KRW" },
                  unit: { type: Type.STRING, description: "Unit like '1개', '100g', '팩' etc" }
                },
                required: ["name", "price", "unit"]
              }
            }
          },
          required: ["products"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from AI");
    return JSON.parse(text).products;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
