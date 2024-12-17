import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import simpleGit, { type SimpleGit } from "simple-git";
import { validateAuthHeaders } from "~/lib/.server/appwrite-server";
import type { GitCredentials } from "~/types/git-credentials";
import { v4 as uuidV4 } from 'uuid';
import type { FileMap } from "~/types/workbench-files";
import {default as klaw} from 'klaw';
import {readFile, rm} from 'fs/promises';

// when setting all options in a single object
const git: SimpleGit = simpleGit();
const giteaBaseUrl = process.env.GITEA_BASE_URL;

export async function loader({
  request,
}: LoaderFunctionArgs) {
  const { prefs, user } = await validateAuthHeaders(request);

  let gitCredentials: GitCredentials | undefined;

  try {
    gitCredentials = JSON.parse(prefs['gitCredentials']);
  } catch (error) {
    console.log("Error parsing git credentials from user's prefs", error);
  }

  if (!gitCredentials) {
    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }

  const url = new URL(request.url);
  const projectRepositoryName = url.searchParams.get("projectRepositoryName");
  if (!projectRepositoryName) {
    throw new Response(null, {
      status: 400,
      statusText: 'Repository name not provided',
    });
  }

  const tempRepoPath = uuidV4();

  const repositoryUrl = `http://${gitCredentials.username}:${gitCredentials.password}@${giteaBaseUrl?.replace('http://', '')}/${gitCredentials.username}/${projectRepositoryName}.git`;
  const repositoryLocalPath = `/tmp/${gitCredentials.username}/${tempRepoPath}`;
  await git.clone(repositoryUrl, repositoryLocalPath);

  const dirents: FileMap = {};

  for await (const item of klaw(repositoryLocalPath, {
    filter: (item) => {
      const path = item.replace(repositoryLocalPath + '/', '');
      return !path.startsWith('.git');
    }
  })) {
    const path = item.path.replace(repositoryLocalPath, '/home/project');
    if (path !== '/home/project') {
      if (item.stats.isDirectory()) {
        dirents[path] = {
          type: 'folder'
        } 
      } else {
        dirents[path] = {
          type: 'file',
          content: await readFile(item.path, {
            encoding: 'utf-8'
          }),
          // TODO - Check if file is binary
          isBinary: false
        }
      }
    }
  }

  await rm(`${repositoryLocalPath}`, {
    recursive: true,
    force: true
  });

  return json(dirents);
}