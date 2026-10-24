import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import handler from './api/analyze';

async function readRequestBody(req: import('http').IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GROQ_API_KEY && !process.env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  }

  return {
    plugins: [
      react(),
      {
        name: 'local-analyze-api',
        configureServer(server) {
          server.middlewares.use('/api/analyze', async (req, res, next) => {
            if (req.method !== 'POST') {
              next();
              return;
            }

            try {
              const body = await readRequestBody(req);
              const request = new Request('http://localhost/api/analyze', {
                method: 'POST',
                headers: req.headers as Record<string, string>,
                body,
              });
              const response = await handler(request);
              res.statusCode = response.status;
              response.headers.forEach((value, key) =>
                res.setHeader(key, value),
              );
              res.end(await response.text());
            } catch (error) {
              next(error);
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
