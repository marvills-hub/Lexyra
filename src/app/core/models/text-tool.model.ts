export type ToolCategory = 'case' | 'cleanup' | 'lines' | 'encode' | 'developer';
export interface TextTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
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
