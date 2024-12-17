import type { Models } from "node-appwrite";
import type { Message } from './message';

export type Project = {
  name: string,
  userId: string,
  repositoryName: string,
  messages: Message[]
} & Models.Document;