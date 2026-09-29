import { Injectable, computed, signal } from '@angular/core';
import { LEXYRA_AI_ACTIONS, buildAiPrompt } from './ai-prompts';
import { LexyraAiApiService } from './lexyra-ai-api.service';

@Injectable({ providedIn: 'root' })
export class LexyraAiService {
  readonly actions = LEXYRA_AI_ACTIONS;
  readonly result = signal('');
  readonly action = signal(localStorage.getItem('lexyra.ai.action') || 'improve');
  readonly instruction = signal('');
  readonly language = signal(localStorage.getItem('lexyra.ai.language') || 'English');
  readonly generating = computed(() => this.api.status() === 'generating');

  constructor(readonly api: LexyraAiApiService) {}

  setAction(value: string) {
    this.action.set(value);
    localStorage.setItem('lexyra.ai.action', value);
  }

  setLanguage(value: string) {
    this.language.set(value);
    localStorage.setItem('lexyra.ai.language', value);
  }

  clear() {
    this.result.set('');
    this.instruction.set('');
  }

  stop() {
    this.api.stop();
  }

  async run(text: string) {
    const prompt = buildAiPrompt(this.action(), text, this.instruction(), this.language());

    if (!prompt.trim()) throw new Error('Enter text or an AI instruction first.');

    this.result.set('');

    await this.api.generate(prompt, (chunk) => {
      this.result.update((current) => current + chunk);
    });

    return this.result();
  }
}
