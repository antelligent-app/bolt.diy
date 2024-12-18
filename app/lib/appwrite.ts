import { Account, Client, Databases, Query, type Models } from 'appwrite';
import type { Project } from '~/types/project';
import type { Message, Tags } from '~/types/message';

const getClient = () => {
  const client = new Client();
  const projectId = document.querySelector('html')?.getAttribute('data-appwrite-project');
  if (!projectId) {
    throw new Error('Appwrite project id not found in html data attribute');
  }
  client.setProject(projectId);
  return client;
};

export const getAccountClient = () => {
  return new Account(getClient());
};

const getDatabases = () => new Databases(getClient());

const getDatabaseId = () => document.querySelector('html')?.getAttribute('data-appwrite-database-id');
const getProjectsCollectionId = () =>
  document.querySelector('html')?.getAttribute('data-appwrite-projects-collection-id');
const getMessagesCollectionId = () =>
  document.querySelector('html')?.getAttribute('data-appwrite-messages-collection-id');
const getTagsCollectionId = () => document.querySelector('html')?.getAttribute('data-appwrite-tags-collection-id');

export const getProjects = async () => {
  const databaseId = getDatabaseId();
  console.log('databaseId: ', databaseId);
  const projectsCollectionId = getProjectsCollectionId();
  console.log('projectsCollectionId: ', projectsCollectionId);
  if (!databaseId || !projectsCollectionId) {
    throw new Error('Appwrite project id not found in html data attribute');
  }
  const projects = await getDatabases().listDocuments<Project>(databaseId, projectsCollectionId);
  return projects.documents;
};

export const getProjectByRepositoryName = async (repositoryName: string) => {
  const databaseId = getDatabaseId();
  const projectsCollectionId = getProjectsCollectionId();
  if (!databaseId || !projectsCollectionId) {
    throw new Error('Appwrite project id not found in html data attribute');
  }
  const projects = await getDatabases().listDocuments<Project>(databaseId, projectsCollectionId, [
    Query.equal('repositoryName', repositoryName),
  ]);
  return projects.documents[0];
};

export const getMessagesByRepositoryName = async (repositoryName: string) => {
  const databaseId = getDatabaseId();
  const messagesCollectionId = getMessagesCollectionId();
  if (!databaseId || !messagesCollectionId) {
    throw new Error('Appwrite project id not found in html data attribute');
  }
  const project = await getProjectByRepositoryName(repositoryName);
  if (!project) {
    return [];
  }
  const messages = await getDatabases().listDocuments<Message>(databaseId, messagesCollectionId, [
    Query.equal('project', project.$id),
  ]);
  return messages.documents;
};

export const getTags = async () => {
  const databaseId = getDatabaseId();
  const tagsCollectionId = getTagsCollectionId();
  if (!databaseId || !tagsCollectionId) {
    throw new Error('Appwrite project id not found in html data attribute');
  }

  console.log('databaseId::: tagsCollectionId::: ', databaseId, tagsCollectionId);
  const tags = await getDatabases().listDocuments<Tags>(databaseId, tagsCollectionId);
  console.log('tags::: ', tags);
  return tags.documents;
};
