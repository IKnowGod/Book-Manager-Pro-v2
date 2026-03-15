# Feature: Global AI Settings (Provider Abstraction)

## Objective
Abstract the hardcoded Gemini API calls to support configuring different AI providers at runtime through a Global Settings UI.

## Overview
Initially, the application was tightly coupled to Google's `@google/generative-ai` SDK using a single hardcoded API key from the environment.

This feature introduces a Global Settings layer to the application:
1. **Dynamic Provider Selection**: Users can choose to use Google Gemini or an OpenAI-compatible provider.
2. **OpenAI SDK Integration**: Added `openai` npm package to support API endpoints matching the OpenAI specification (which allows the use of local models via LMStudio, Ollama, etc.).
3. **Database Configuration**: Added a `Setting` table in Prisma (`key`, `value`) to store the `ai_provider`, `ai_api_key`, `ai_base_url`, and `ai_model` globally.
4. **Unified AI Service**: The `backend/src/services/ai.ts` acts as a proxy, fetching the settings from Prisma on every AI invocation and routing the prompt to the correct SDK and model.
5. **Frontend UI**: Built a `GlobalSettingsPage` accessible at `/settings` with a form to configure parameters seamlessly from the browser, accessible via a link in the sidebar footer.

## Usage
Users can visit **⚙️ Global Settings** via the sidebar. When configured with `openai` and a custom base url like `http://localhost:1234/v1`, all backend features (narrative analysis, inconsistency checking, tag suggestion) transparently route through the user's local instance instead of expending API budget.
