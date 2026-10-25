interface PagesFunctionContext {
  request: Request;
}

export function onRequest(context: PagesFunctionContext): Response {
  void context;
  return new Response(
    JSON.stringify({
      error: 'API route not found',
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
