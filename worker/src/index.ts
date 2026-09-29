export interface Env {
  AI: Ai;
  ASSETS: Fetcher;
}

const MODEL = '@cf/openai/gpt-oss-20b';

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

const allowedMethod = (request: Request, method: string) => request.method.toUpperCase() === method;

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/ai/status') {
      if (!allowedMethod(request, 'GET')) {
        return json({ error: 'Method not allowed.' }, 405);
      }

      return json({
        ok: true,
        service: 'Lexyra AI',
        provider: 'Cloudflare Workers AI',
        model: MODEL,
      });
    }

    if (url.pathname === '/api/ai/generate') {
      if (!allowedMethod(request, 'POST')) {
        return json({ error: 'Method not allowed.' }, 405);
      }

      try {
        const contentType = request.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
          return json({ error: 'Content-Type must be application/json.' }, 415);
        }

        const body = (await request.json()) as { prompt?: unknown };
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

        if (!prompt) {
          return json({ error: 'Prompt is required.' }, 400);
        }

        if (prompt.length > 120000) {
          return json({ error: 'Input is too large for this request.' }, 413);
        }

        const stream = await env.AI.run(MODEL, {
          messages: [
            {
              role: 'system',
              content:
                'You are Lexyra AI, a precise text transformation and writing assistant. Follow the user instruction exactly. Preserve meaning unless the requested operation requires changing it. Return only the requested result unless an explanation is explicitly requested.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: true,
          max_tokens: 4096,
          temperature: 0.4,
        });

        const source = stream as ReadableStream<Uint8Array>;
        const reader = source.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        let buffer = '';

        const output = new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  if (buffer.trim()) {
                    const text = extractSse(buffer);
                    if (text) controller.enqueue(encoder.encode(text));
                  }
                  controller.close();
                  return;
                }

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split(/\r?\n\r?\n/);
                buffer = events.pop() || '';

                for (const event of events) {
                  const text = extractSse(event);
                  if (text) {
                    controller.enqueue(encoder.encode(text));
                    return;
                  }
                }
              }
            } catch (error) {
              controller.error(error);
            }
          },
          cancel() {
            reader.cancel().catch(() => undefined);
          },
        });

        return new Response(output, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      } catch (error) {
        return json(
          {
            error: error instanceof Error ? error.message : 'Lexyra AI request failed.',
          },
          500,
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

function extractSse(event: string) {
  let output = '';

  for (const line of event.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;

    const data = line.slice(5).trim();

    if (!data || data === '[DONE]') continue;

    try {
      const parsed = JSON.parse(data) as {
        response?: string;
        choices?: Array<{
          delta?: { content?: string };
        }>;
      };

      if (typeof parsed.response === 'string') {
        output += parsed.response;
        continue;
      }

      const content = parsed.choices?.[0]?.delta?.content;
      if (typeof content === 'string') output += content;
    } catch {}
  }

  return output;
}
