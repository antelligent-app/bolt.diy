import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { validateAuthHeaders } from "~/lib/.server/appwrite-server";
import type { GitCredentials } from "~/types/git-credentials";
import type { FileMap } from "~/types/workbench-files";
import { simpleGit, type SimpleGit, type SimpleGitOptions } from 'simple-git';
import axios from 'axios';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import type { CommitInfo } from "~/types/commits";

// when setting all options in a single object
const git: SimpleGit = simpleGit();
const giteaBaseUrl = process.env.GITEA_BASE_URL;

const listCommitsByRepoName = async (gitCredentials: GitCredentials, projectRepositoryName: string): Promise<Array<CommitInfo>> => {
  let response = await axios.get(`${giteaBaseUrl}/api/v1/repos/${gitCredentials.username}/${projectRepositoryName}/commits`, {
    auth: {
      username: gitCredentials.username,
      password: gitCredentials.password
    }
  });
  return response.data;
}

export async function action({
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

  const { fileMap, projectRepositoryName } = await request.json<{
    fileMap: FileMap,
    projectRepositoryName: string
  }>();

  const repositoryUrl = `http://${gitCredentials.username}:${gitCredentials.password}@${giteaBaseUrl?.replace('http://', '')}/${gitCredentials.username}/${projectRepositoryName}.git`;
  const repositoryLocalPath = `/tmp/${gitCredentials.username}/${projectRepositoryName}`;
  await git.clone(repositoryUrl, repositoryLocalPath);

  const gitOptions: Partial<SimpleGitOptions> = {
    baseDir: repositoryLocalPath,
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false,
  };


  const repoGit = simpleGit(gitOptions);

  await repoGit.addConfig('user.email', user.email);
  await repoGit.addConfig('user.name', user.name);

  for (const path in fileMap) {
    if (Object.prototype.hasOwnProperty.call(fileMap, path)) {
      const element = fileMap[path];
      if (element?.type === "folder") {
        await mkdir(`${repositoryLocalPath}/${path.replace('/home/project/', '')}`, {recursive: true})
      }
    }
  }

  const filesToCommit = [];

  for (const path in fileMap) {
    if (Object.prototype.hasOwnProperty.call(fileMap, path)) {
      const element = fileMap[path];
      if (element?.type === 'file') {
        const relativeFilePath = path.replace('/home/project/', '');
        const filePath = `${repositoryLocalPath}/${relativeFilePath}`;
        await writeFile(filePath, element.content, {
          encoding: 'utf-8'
        });
        filesToCommit.push(relativeFilePath);
      }
    }
  }

  await repoGit.add(filesToCommit)

  // TODO: Get commit message from user or auto generate using AI
  await repoGit.commit('New updates')

  await repoGit.push();

  await rm(`${repositoryLocalPath}`, {
    recursive: true,
    force: true
  });

  console.log('gitCreds:', gitCredentials);

  return json({});
}

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

  console.log('gitCredentials =', gitCredentials);
  console.log('projectRepositoryName =', projectRepositoryName);
  const commits = await listCommitsByRepoName(gitCredentials, projectRepositoryName);
  return json({
    commits
  });
}