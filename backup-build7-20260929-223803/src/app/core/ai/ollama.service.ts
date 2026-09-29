import { Injectable, signal } from '@angular/core';
import { OllamaGenerateChunk, OllamaModel } from './ai.model';

@Injectable({ providedIn: 'root' })
export class OllamaService {
  readonly baseUrl = signal(
    localStorage.getItem('lexyra.ai.ollamaUrl') || 'http://localhost:11434',
  );
  readonly model = signal(localStorage.getItem('lexyra.ai.model') || '');
  readonly models = signal<OllamaModel[]>([]);
  readonly status = signal<'checking' | 'online' | 'offline' | 'generating' | 'error'>('checking');
  readonly error = signal('');
  private controller: AbortController | null = null;

  setBaseUrl(value: string) {
    const clean = value.trim().replace(/\/+$/, '') || 'http://localhost:11434';
    this.baseUrl.set(clean);
    localStorage.setItem('lexyra.ai.ollamaUrl', clean);
  }

  setModel(value: string) {
    this.model.set(value);
    localStorage.setItem('lexyra.ai.model', value);
  }

  async refreshModels() {
    this.status.set('checking');
    this.error.set('');
    try {
      const response = await fetch(`${this.baseUrl()}/api/tags`);
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const data = (await response.json()) as { models?: OllamaModel[] };
      const models = data.models ?? [];
      this.models.set(models);
      if (!this.model() && models.length) this.setModel(models[0].name);
      if (this.model() && !models.some((x) => x.name === this.model()) && models.length)
        this.setModel(models[0].name);
      this.status.set('online');
      return models;
    } catch (error) {
      this.models.set([]);
      this.status.set('offline');
      this.error.set(error instanceof Error ? error.message : 'Unable to connect to Ollama');
      return [];
    }
  }

  stop() {
    this.controller?.abort();
    this.controller = null;
    if (this.status() === 'generating') this.status.set('online');
  }

  async generate(prompt: string, onChunk: (text: string) => void) {
    if (!this.model()) throw new Error('Select an Ollama model first.');
    this.stop();
    this.controller = new AbortController();
    this.status.set('generating');
    this.error.set('');

    try {
      const response = await fetch(`${this.baseUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model(),
          prompt,
          stream: true,
        }),
        signal: this.controller.signal,
      });

      if (!response.ok)
        throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
      if (!response.body) throw new Error('Ollama returned no response stream.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const chunk = JSON.parse(trimmed) as OllamaGenerateChunk;
          if (chunk.response) onChunk(chunk.response);
        }
      }

      if (buffer.trim()) {
        const chunk = JSON.parse(buffer) as OllamaGenerateChunk;
        if (chunk.response) onChunk(chunk.response);
      }

      this.status.set('online');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        this.status.set('online');
        return;
      }
      this.status.set('error');
      this.error.set(error instanceof Error ? error.message : 'AI generation failed');
      throw error;
    } finally {
      this.controller = null;
    }
  }
}
