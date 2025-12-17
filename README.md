# Genealogy App

A flexible genealogy tree application with support for custom AI providers and backends.

## Features

- Build and visualize family trees
- Edit person details and relationships
- Support for custom AI biography generation
- Share family trees with access controls
- Mock backend with localStorage for demo mode

## Run Locally

**Prerequisites:** Node.js

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Configure AI Biography Generation

   To enable AI biography generation, set the `VITE_AI_ENDPOINT` in `.env.local`:
   
   ```env
   VITE_AI_ENDPOINT=http://your-backend.com/api/generate-biography
   ```

   The endpoint should accept POST requests with this payload:
   ```json
   {
     "prompt": "biography generation prompt",
     "person": { "firstName": "...", "lastName": "...", "birthDate": "...", ... }
   }
   ```

   And return:
   ```json
   {
     "biography": "generated biography text in markdown"
   }
   ```

   **Supported providers:**
   - Your custom backend API
   - OpenAI API (ChatGPT)
   - Anthropic API (Claude)
   - Other LLM providers

3. Run the app:
   ```bash
   npm run dev
   ```

### Building for Production

```bash
npm run build
```

## Architecture

- **Frontend:** React + TypeScript with D3 for tree visualization
- **Backend:** Mock implementation using localStorage (can be replaced)
- **AI Service:** Generic implementation supporting any provider via HTTP endpoint

## Customization

### Using Your Own Backend

Edit [services/api.ts](services/api.ts) to replace the mock backend with your API calls.

### Integrating a Different AI Provider

Update [services/geminiService.ts](services/geminiService.ts) with your AI provider's client library and endpoint.
