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
export type ToolBehavior = 'transform' | 'result';
export interface TextTool {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: ToolCategory;
  icon: string;
  behavior: ToolBehavior;
}
export interface ToolCategoryItem {
  id: 'all' | ToolCategory;
  name: string;
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
