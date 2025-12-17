import { Person } from "../types";

/**
 * Generic AI Service for biography generation
 * 
 * To integrate your own AI provider or backend:
 * 1. Implement the generateBiography function with your API client
 * 2. Update the API_ENDPOINT and authentication as needed
 * 3. Modify the prompt if using a different AI model
 * 
 * Example providers:
 * - OpenAI API (ChatGPT)
 * - Anthropic API (Claude)
 * - Your custom backend API
 * - Other LLM providers
 */

const API_ENDPOINT = import.meta.env.VITE_AI_ENDPOINT || 'http://localhost:3000/api/generate-biography';

export const generateBiography = async (person: Person): Promise<string> => {
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
    // Send request to your backend or AI provider
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, person }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.biography || '';
  } catch (error) {
    console.error("Biography generation error:", error);
    throw error;
  }
};

export const suggestRelationships = async (text: string): Promise<any> => {
  // This could be used to parse a text dump into a family structure
  // Implement with your backend API
  return null;
};