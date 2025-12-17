# AI Biography Generation Integration Guide

This app supports flexible integration with any AI provider or custom backend for generating biographies.

## Quick Start

1. **Environment Setup**

   Create `.env.local` and add your AI endpoint:
   ```env
   VITE_AI_ENDPOINT=http://your-backend.com/api/generate-biography
   ```

2. **Expected API Format**

   Your endpoint should:
   - Accept POST requests
   - Receive JSON with `prompt` and `person` fields
   - Return JSON with `biography` field (Markdown format)

   Example request:
   ```json
   {
     "prompt": "Generate biography...",
     "person": {
       "id": "1",
       "firstName": "John",
       "lastName": "Doe",
       "gender": "Male",
       "birthDate": "1950-01-01",
       "deathDate": null,
       "birthPlace": "New York",
       "occupation": "Engineer",
       "biography": ""
     }
   }
   ```

   Example response:
   ```json
   {
     "biography": "## John Doe\n\n**Full Name:** John Doe\n\n### Early Years\n..."
   }
   ```

## Provider Examples

### 1. OpenAI (ChatGPT)

**Backend Implementation (Node.js):**

```javascript
app.post('/api/generate-biography', async (req, res) => {
  const { prompt } = req.body;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    res.json({ biography: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Frontend .env.local:**
```env
VITE_AI_ENDPOINT=http://localhost:3000/api/generate-biography
```

### 2. Anthropic (Claude)

**Backend Implementation (Node.js):**

```javascript
app.post('/api/generate-biography', async (req, res) => {
  const { prompt } = req.body;
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({ biography: response.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Custom Backend (Your Own Solution)

No need for complex AI - implement your own logic:

```javascript
app.post('/api/generate-biography', (req, res) => {
  const { person } = req.body;
  
  // Your custom logic
  const biography = `## ${person.firstName} ${person.lastName}
  
Born: ${person.birthDate} in ${person.birthPlace}
Occupation: ${person.occupation}
`;

  res.json({ biography });
});
```

## Direct Client-Side Integration

If you want to call an AI API directly from the frontend without a backend:

Edit `services/geminiService.ts`:

```typescript
export const generateBiography = async (person: Person): Promise<string> => {
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  
  // Your implementation here
  const response = await fetch('https://api.provider.com/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'model-name',
      prompt: yourPrompt,
    }),
  });

  const data = await response.json();
  return data.result;
};
```

## Disabling AI Generation

If you don't want AI biography generation:

1. Don't set `VITE_AI_ENDPOINT`
2. Users can still edit biographies manually
3. The AI button will show an error if clicked (helpful for debugging)

## Troubleshooting

**"AI API error" when clicking Generate:**
- Check your `VITE_AI_ENDPOINT` is correct
- Verify your backend is running and accessible
- Check browser console (F12) for CORS errors
- Ensure your backend returns the correct JSON format

**Biographies not generated:**
- Verify the API response includes `biography` field
- Check the response is valid JSON
- Review your backend logs for errors

**CORS Issues:**
Add proper CORS headers to your backend:
```javascript
app.use(cors());
```

## File Locations

- **AI Service:** [services/geminiService.ts](../services/geminiService.ts)
- **Main API Config:** [services/api.ts](../services/api.ts)
- **EditorPanel (uses AI):** [components/EditorPanel.tsx](../components/EditorPanel.tsx#L56)
