import type { Models } from 'node-appwrite'

export type Message = {
  id: string,
  project?: string,
  role: 'function' | 'user' | 'tool' | 'system' | 'assistant' | 'data',
  content: string,
} & Models.Document;