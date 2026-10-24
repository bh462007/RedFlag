# ClauseByClause

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-uxxvx5se)

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root and add your Groq API key:

   ```text
   GROQ_API_KEY=your_groq_api_key
   ```

   Keep this value server-side. Do not use a `VITE_` prefix or expose it in
   client code.

3. Start the development server:

   ```bash
   npm run dev
   ```

The Vite development server exposes the local `POST /api/analyze` route and
uses the `openai/gpt-oss-20b` Groq model. The API key is read only by the
server-side handler.

## Deployment

Configure `GROQ_API_KEY` as a server-side environment variable in the
deployment provider, then deploy the project with its serverless `api/`
function support enabled. Do not commit `.env.local` or the API key.

## Validation

```bash
npm run typecheck
npm run typecheck:api
npm run lint
npm run build
```
