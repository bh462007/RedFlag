import { analyzeRequest } from '../../api/analyze.ts';

interface PagesEnvironment {
  GROQ_API_KEY?: string;
}

interface PagesFunctionContext {
  request: Request;
  env: PagesEnvironment;
}

export function onRequest({
  request,
  env,
}: PagesFunctionContext): Promise<Response> {
  return analyzeRequest(request, env.GROQ_API_KEY);
}
