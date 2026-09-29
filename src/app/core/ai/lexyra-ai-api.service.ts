import { Injectable, signal } from '@angular/core';

export type LexyraAiStatus = 'checking' | 'online' | 'offline' | 'generating' | 'error';

@Injectable({ providedIn: 'root' })
export class LexyraAiApiService {
  readonly status = signal<LexyraAiStatus>('checking');
  readonly error = signal('');
  readonly model = signal('');
  readonly provider = signal('Cloudflare Workers AI');
  private controller: AbortController | null = null;

  async check() {
    this.status.set('checking');
    this.error.set('');
    try {
      const response = await fetch('/api/ai/status', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Lexyra AI API returned ${response.status}`);
      const data = (await response.json()) as {
        ok?: boolean;
        model?: string;
        provider?: string;
      };
      if (!data.ok) throw new Error('Lexyra AI is unavailable.');
      this.model.set(data.model || '');
      this.provider.set(data.provider || 'Cloudflare Workers AI');
      this.status.set('online');
      return true;
    } catch (error) {
      this.status.set('offline');
      this.error.set(
        error instanceof Error ? error.message : 'Unable to connect to Lexyra AI.',
      );
      return false;
    }
  }

  stop() {
    this.controller?.abort();
    this.controller = null;
    if (this.status() === 'generating') this.status.set('online');
  }

  async generate(prompt: string, onChunk: (text: string) => void) {
    if (!prompt.trim()) throw new Error('Enter text or an AI instruction first.');

    this.stop();
    this.controller = new AbortController();
    this.status.set('generating');
    this.error.set('');

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/plain',
        },
        body: JSON.stringify({ prompt }),
        signal: this.controller.signal,
      });

      if (!response.ok) {
        let message = `Lexyra AI returned ${response.status}`;
        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {}
        throw new Error(message);
      }

      if (!response.body) throw new Error('Lexyra AI returned no response stream.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) onChunk(chunk);
      }

      const tail = decoder.decode();
      if (tail) onChunk(tail);
      this.status.set('online');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        this.status.set('online');
        return;
      }

      this.status.set('error');
      this.error.set(
        error instanceof Error ? error.message : 'Lexyra AI generation failed.',
      );
      throw error;
    } finally {
      this.controller = null;
    }
  }
}
