import type { Models } from "node-appwrite";
import type { Message } from './message';

export type Tags = {
  name: string,
}

export type Project = {
  name: string,
  userId: string,
  repositoryName: string,
  messages: Message[],
  tags: Tags[],
} & Models.Document;