import { LexyraAiAction } from './ai.model';

export const LEXYRA_AI_ACTIONS: LexyraAiAction[] = [
  {
    id: 'rewrite',
    name: 'Rewrite',
    description: 'Rewrite while preserving the original meaning.',
    icon: 'refresh-cw',
    instruction:
      'Rewrite the following text while preserving its meaning. Return only the rewritten text.',
  },
  {
    id: 'paraphrase',
    name: 'Paraphrase',
    description: 'Express the text using different wording.',
    icon: 'repeat-2',
    instruction:
      'Paraphrase the following text naturally while preserving its meaning. Return only the result.',
  },
  {
    id: 'improve',
    name: 'Improve Writing',
    description: 'Improve clarity, flow and readability.',
    icon: 'sparkles',
    instruction:
      'Improve the clarity, flow, grammar and readability of the following text. Preserve its meaning and return only the improved text.',
  },
  {
    id: 'grammar',
    name: 'Fix Grammar',
    description: 'Correct grammar, spelling and punctuation.',
    icon: 'spell-check-2',
    instruction:
      'Correct grammar, spelling and punctuation in the following text without unnecessarily changing its style. Return only the corrected text.',
  },
  {
    id: 'summarize',
    name: 'Summarize',
    description: 'Create a concise summary.',
    icon: 'list-collapse',
    instruction:
      'Summarize the following text concisely while retaining the important information. Return only the summary.',
  },
  {
    id: 'expand',
    name: 'Expand',
    description: 'Add useful detail and explanation.',
    icon: 'maximize-2',
    instruction:
      'Expand the following text with useful detail while keeping the same intent and tone. Return only the expanded text.',
  },
  {
    id: 'shorten',
    name: 'Shorten',
    description: 'Make the text more concise.',
    icon: 'minimize-2',
    instruction:
      'Make the following text substantially more concise without losing important meaning. Return only the shortened text.',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Use a professional tone.',
    icon: 'briefcase-business',
    instruction:
      'Rewrite the following text in a polished professional tone. Return only the rewritten text.',
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Use a natural casual tone.',
    icon: 'coffee',
    instruction:
      'Rewrite the following text in a friendly natural casual tone. Return only the rewritten text.',
  },
  {
    id: 'simplify',
    name: 'Simplify',
    description: 'Make difficult text easier to understand.',
    icon: 'badge-help',
    instruction:
      'Simplify the following text so it is easy to understand while preserving the important information. Return only the simplified text.',
  },
  {
    id: 'explain',
    name: 'Explain',
    description: 'Explain the supplied text clearly.',
    icon: 'message-circle-question',
    instruction: 'Explain the following text clearly and accurately. Return only the explanation.',
  },
  {
    id: 'continue',
    name: 'Continue Writing',
    description: 'Continue naturally from the existing text.',
    icon: 'forward',
    instruction:
      'Continue writing naturally from the following text. Match its style and context. Return only the continuation.',
  },
  {
    id: 'generate',
    name: 'Generate',
    description: 'Generate text from an instruction.',
    icon: 'wand-sparkles',
    instruction:
      'Follow the instruction and generate the requested text. Return only the requested content.',
  },
  {
    id: 'translate',
    name: 'Translate',
    description: 'Translate into a requested language.',
    icon: 'languages',
    instruction:
      'Translate the following text into the requested language. Preserve meaning and formatting where practical. Return only the translation.',
  },
  {
    id: 'custom',
    name: 'Custom Prompt',
    description: 'Give Lexyra AI your own instruction.',
    icon: 'bot',
    instruction: '',
  },
];

export function buildAiPrompt(
  action: string,
  text: string,
  instruction = '',
  language = '',
): string {
  const item = LEXYRA_AI_ACTIONS.find((x) => x.id === action);
  if (action === 'custom') {
    return `${instruction.trim()}

TEXT:
${text}`.trim();
  }
  if (action === 'generate') {
    return `${item?.instruction ?? ''}

INSTRUCTION:
${instruction.trim()}

CONTEXT:
${text}`.trim();
  }
  if (action === 'translate') {
    return `${item?.instruction ?? ''}

TARGET LANGUAGE:
${language.trim() || 'English'}

TEXT:
${text}`.trim();
  }
  return `${item?.instruction ?? instruction}

TEXT:
${text}`.trim();
}
