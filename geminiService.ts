
import { GoogleGenAI, Type } from "@google/genai";

export const analyzeMartImage = async (base64Data: string) => {
  const savedKey = localStorage.getItem('mm_api_key');
  const apiKey = savedKey || process.env.API_KEY || '';
  
  // Initialize with the correct named parameter
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Analyze this image which is either a supermarket shelf photo, a paper receipt, or a mobile screenshot from a shopping app (like Naver Store, Coupang, Market Kurly).
    
    Extract the following for each grocery or product item found:
    1. Product Name: Clean name of the item.
    2. Price: Final price (after discounts if visible).
    3. Unit: Measurement like '1ea', '100g', '1 pack', '500ml' etc.
    
    If it's a mobile shopping app screenshot, focus on the main product title and the prominently displayed price.
    Return the result as a JSON object with a 'products' array.
  `;
  
  try {
    // Call generateContent directly from ai.models
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

    // Access .text property directly (not a method)
    const text = response.text;
    if (!text) throw new Error("No data returned from AI");
    return JSON.parse(text).products;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
