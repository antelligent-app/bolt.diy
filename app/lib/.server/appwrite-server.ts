import { Account, Client, Databases, ID, Permission, RelationshipType, Role, Users } from 'node-appwrite';
import type { Tags } from '~/types/message';
import type { Project } from '~/types/project';

const client = new Client();

if (!process.env.APPWRITE_PROJECT || !process.env.APPWRITE_NODE_API_KEY) {
  throw new Error('AppWrite Credentials Missing');
}

client
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_NODE_API_KEY)
  .setSelfSigned(true)


const DATABASE_NAME = 'Presentation';



// Accounts
export const account = new Account(client)

export const validateAuthHeaders = async (request: Request) => {
  const authToken = request.headers.get('Authorization');
  if (!authToken || authToken.split(' ')[0] !== 'Bearer') {
    throw new Response('Invalid or missing API key', {
      status: 401,
      statusText: 'Unauthorized'
    });
  }
  if (!process.env.APPWRITE_PROJECT || !process.env.APPWRITE_NODE_API_KEY) {
    throw new Error('AppWrite Credentials Missing');
  }
  const currentUserClient = new Client()
    .setProject(process.env.APPWRITE_PROJECT)                  // Your project ID
    .setJWT(authToken.split(' ')[1]);
  const prefs = await new Account(currentUserClient).getPrefs();
  const user = await new Account(currentUserClient).get();
  return {
    prefs,
    user
  }
}


// Users
export const users = new Users(client);

// Databases
const databases = new Databases(client);

export const getDatabaseId = async () => {
  const databaseList = await databases.list()
  let database = databaseList.databases.find((database) => (database.name === DATABASE_NAME));
  if (!database) {
    database = await databases.create(ID.unique(), DATABASE_NAME);
  }
  return database.$id;
}

const getCollectionByName = async (name: string) => {
  const collectionList = await databases.listCollections(await getDatabaseId());
  let collection = collectionList.collections.find((collection) => (collection.name === name));
  if (!collection) {
    collection = await databases.createCollection(await getDatabaseId(), ID.unique(), name, [], true);
  }
  return collection;
}

export const getProjectsCollectionId = async () => {
  const projectsCollection = await getCollectionByName('projects');
  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'name') === -1) {
    await databases.createStringAttribute(projectsCollection.databaseId, projectsCollection.$id, 'name', 1024, true)
  }
  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'userId') === -1) {
    await databases.createStringAttribute(projectsCollection.databaseId, projectsCollection.$id, 'userId', 1024, true)
  }
  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'repositoryName') === -1) {
    await databases.createStringAttribute(projectsCollection.databaseId, projectsCollection.$id, 'repositoryName', 1024, true)
  }
  return projectsCollection.$id;
}

export const getMessagesCollectionId = async () => {
  const projectsCollection = await getCollectionByName('messages');
  const projectsCollectionId = await getProjectsCollectionId();
  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'project') === -1) {
    await databases.createRelationshipAttribute(projectsCollection.databaseId, projectsCollection.$id, projectsCollectionId, RelationshipType.ManyToOne, true, 'project', 'messages');
  }
  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'role') === -1) {
    await databases.createStringAttribute(projectsCollection.databaseId, projectsCollection.$id, 'role', 1024, true);
  }
  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'content') === -1) {
    await databases.createStringAttribute(projectsCollection.databaseId, projectsCollection.$id, 'content', 1048576, true);
  }
  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'id') === -1) {
    await databases.createStringAttribute(projectsCollection.databaseId, projectsCollection.$id, 'id', 1024, true);
  }
  return projectsCollection.$id;
}
export const getProjectsTagsCollectionId = async () => {
  const projectsCollection = await getCollectionByName('tags');
  const projectsCollectionId = await getProjectsCollectionId();

  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'project') === -1) {
    await databases.createRelationshipAttribute(projectsCollection.databaseId, projectsCollection.$id, projectsCollectionId, RelationshipType.ManyToMany, true, 'project', 'tags');
  }
  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'name') === -1) {
    await databases.createStringAttribute(projectsCollection.databaseId, projectsCollection.$id, 'name', 1024, true);
  }
  if (projectsCollection.attributes.findIndex((attribute: any) => attribute.key === 'userCanUseThisTag') === -1) {
    await databases.createBooleanAttribute(projectsCollection.databaseId, projectsCollection.$id, 'userCanUseThisTag', true);
  }
  return projectsCollection.$id;
}


export const createMessageDocument = async (role: 'user' | 'assistant', content: string, projectId: string, userId: string) => {
  const message = await databases.createDocument(await getDatabaseId(), await getMessagesCollectionId(), ID.unique(), {
    project: projectId,
    role,
    content,
    id: ID.unique()
  }, [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId))
  ]);
  return message;
}

export const createProjectDocument = async (name: string, repositoryName: string, userId: string) => {
  const project = await databases.createDocument<Project>(await getDatabaseId(), await getProjectsCollectionId(), ID.unique(), {
    name,
    repositoryName,
    userId
  }, [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId))
  ]);
  return project;
}


export const updateProjectTags = async (projectId: string, userId: string, tagNames: string[]) => {
  const databaseId = await getDatabaseId();
  const tagsCollectionId = await getProjectsTagsCollectionId();
  const allTags = await databases.listDocuments<Tags>(databaseId, tagsCollectionId);

  const user = await users.get(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const tags = tagNames.map((name) => {
    const existingTag = allTags.documents.find((t) => t.name === name);
    if (existingTag) {
      return existingTag;
    }
  });

  if (tags.length === 0) {
    return [];
  }

  if(user.labels.includes('admin')) {
    const tagIds = tags.map((tag) => {
      if (tag) {
        return tag.$id;
      }
    });
    const project = await databases.updateDocument<Project>(await getDatabaseId(), await getProjectsCollectionId(), projectId, {
      userId,
      tags: tagIds
    }, [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]);
    return project;
  } 

  // only allow tags that the user can use
  const tagIds = tags.map((tag) => {
    if (tag && tag.userCanUseThisTag) {
      return tag.$id;
    }
  });

  if (tagIds.length === 0) {
    return [];
  }

  const project = await databases.updateDocument<Project>(await getDatabaseId(), await getProjectsCollectionId(), projectId, {
    userId,
    tags: tagIds
  }, [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId))
  ]);

  return project;
}

export const createTagDocument = async ({
  name, 
  userId, 
  userCanUseThisTag = false,
  projectId 
}: {
    name: string;
    userId: string;
    userCanUseThisTag: boolean;
    projectId?: string;
  }
) => {
  const tag = await databases.createDocument<Tags>(await getDatabaseId(), await getProjectsTagsCollectionId(), ID.unique(), {
    name,
    project: projectId,
    userCanUseThisTag: userCanUseThisTag
  }, [
    Permission.read(Role.any()),
    Permission.update(Role.label('admin')),
    Permission.delete(Role.label('admin'))
  ]);
  return tag;
}

export const getTagsByNames = async (tags: string[]) => {
  const tagsCollectionId = await getProjectsTagsCollectionId();
  const allTags = await databases.listDocuments<Tags>(await getDatabaseId(), tagsCollectionId);
  return allTags.documents.filter((tag) => tags.includes(tag.name));
}