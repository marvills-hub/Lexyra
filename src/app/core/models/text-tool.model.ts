export type ToolCategory =
  | 'format'
  | 'cleanup'
  | 'lines'
  | 'convert'
  | 'code'
  | 'generate'
  | 'analyze'
  | 'developer'
  | 'security';
export interface TextTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  input?: boolean;
}
export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingMinutes: number;
}
