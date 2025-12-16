import { GoogleGenAI } from "@google/genai";
import { Person } from "../types";

// Ensure API Key is available
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateBiography = async (person: Person): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const prompt = `
    Напиши краткую, но интересную биографию для генеалогического древа на русском языке в формате Markdown.
    Используй следующие факты (если они есть):
    Имя: ${person.firstName} ${person.lastName}
    Дата рождения: ${person.birthDate || 'Неизвестно'}
    Дата смерти: ${person.deathDate || 'По сей день'}
    Место рождения: ${person.birthPlace || 'Неизвестно'}
    Профессия/Род деятельности: ${person.occupation || 'Не указано'}
    Пол: ${person.gender}

    Структура:
    1. Введение
    2. Ранние годы (придумай правдоподобный контекст, если данных мало, но отметь что это предположение, или опирайся строго на факты если попросят)
    3. Карьера и жизнь
    4. Наследие

    Если данных мало, напиши короткую красивую заглушку, которую пользователь сможет дополнить. Используй заголовки h2, списки и жирный шрифт.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const suggestRelationships = async (text: string): Promise<any> => {
  if (!apiKey) throw new Error("API Key is missing");
  // This could be used to parse a text dump into a family structure
  // Implementation omitted for brevity in this specific requested feature set, 
  // but keeping the structure ready.
  return null;
};