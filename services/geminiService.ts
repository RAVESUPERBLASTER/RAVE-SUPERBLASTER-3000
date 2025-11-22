import { GoogleGenAI, Type } from "@google/genai";
import { Track } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generatePattern = async (
  bpm: number, 
  tracks: Track[],
  description: string
): Promise<{ tracks: { name: string, steps: number[] }[], bpm: number, name: string }> => {
  
  if (!process.env.API_KEY) {
    console.warn("No API Key found for Gemini");
    // Return a mock random pattern if no key
    return {
      name: "No API Key Random",
      bpm: 120,
      tracks: tracks.map(t => ({
        name: t.name,
        steps: Array(16).fill(0).map(() => Math.random() > 0.7 ? 1 : 0)
      }))
    };
  }

  const trackNames = tracks.map(t => t.name).join(", ");

  const prompt = `
    Generate a 16-step sequencer pattern for a groovebox.
    Style: ${description}.
    BPM: ${bpm}.
    Available Tracks: ${trackNames}.
    
    Return a JSON object with a pattern name, recommended BPM (close to ${bpm}), and a list of tracks. 
    Each track in the list must have a 'name' (matching one of the available tracks) and 'steps' (an array of 16 integers, 1 for trigger, 0 for silence).
    Make it groovy and musical.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            bpm: { type: Type.NUMBER },
            tracks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  steps: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER }
                  }
                },
                required: ["name", "steps"]
              }
            }
          },
          required: ["name", "bpm", "tracks"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini generation failed:", error);
    throw error;
  }
};
