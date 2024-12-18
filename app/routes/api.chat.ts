import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createMessageDocument, createProjectDocument, validateAuthHeaders } from '~/lib/.server/appwrite-server';
import { createDataStream } from 'ai';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/common/prompts/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import type { IProviderSetting } from '~/types/model';
import { faker } from '@faker-js/faker';
import Case from 'case';
import axios from 'axios';
import type { GitRepository } from '~/types/git-repository';
import type { GitCredentials } from '~/types/git-credentials';
const giteaBaseUrl = process.env.GITEA_BASE_URL;

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

const listGitReposByCurrentUser = async (gitCredentials: GitCredentials): Promise<Array<GitRepository>> => {
  let response = await axios.get(`${giteaBaseUrl}/api/v1/user/repos?page=1&limit=500`, {
    auth: {
      username: gitCredentials.username,
      password: gitCredentials.password,
    },
  });
  return response.data;
};

const createGitRepoForCurrentUser = async (
  repoName: string,
  gitCredentials: GitCredentials,
): Promise<GitRepository> => {
  let response = await axios.post(
    `${giteaBaseUrl}/api/v1/user/repos`,
    {
      name: repoName,
      default_branch: 'main',
    },
    {
      auth: {
        username: gitCredentials.username,
        password: gitCredentials.password,
      },
    },
  );
  return response.data;
};

const getOrCreateGitRepo = async (projectName: string, gitCredentials: GitCredentials) => {
  if (!projectName) {
    projectName = faker.internet.domainWord();
    console.log('No project name found, generating fake project name: ', projectName);
  }
  const repoName = Case.kebab(projectName);
  const existingRepos = await listGitReposByCurrentUser(gitCredentials);
  let projectRepo = existingRepos.find((repo) => repo.name === repoName);
  if (!projectRepo) {
    projectRepo = await createGitRepoForCurrentUser(repoName, gitCredentials);
  }
  return projectRepo;
};

async function chatAction({ context, request }: ActionFunctionArgs) {
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


  const { messages, files, promptId, projectName } = await request.json<{
    messages: Messages;
    files: any;
    promptId?: string;
    projectName: string;

  }>();

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = JSON.parse(parseCookies(cookieHeader || '').apiKeys || '{}');
  const providerSettings: Record<string, IProviderSetting> = JSON.parse(
    parseCookies(cookieHeader || '').providers || '{}',
  );

  const gitRepository = await getOrCreateGitRepo(projectName, gitCredentials);

  const project = await createProjectDocument(projectName, gitRepository.name, user.$id);

  const stream = new SwitchableStream();

  messages.forEach(async (message) => {
    await createMessageDocument(message.role, message.content, project.$id, user.$id);
  });
  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };

  try {
    const options: StreamingOptions & {
      apiKeys: unknown;
      project: unknown;
    } = {
      toolChoice: 'none',
      apiKeys,
      project,
      onFinish: async ({ text: content, finishReason, usage }) => {
        await createMessageDocument('assistant', content, project.$id, user.$id);


        if (usage) {
          cumulativeUsage.completionTokens += usage.completionTokens || 0;
          cumulativeUsage.promptTokens += usage.promptTokens || 0;
          cumulativeUsage.totalTokens += usage.totalTokens || 0;
        }

        if (finishReason !== 'length') {
          return stream
            .switchSource(
              createDataStream({
                async execute(dataStream: { writeMessageAnnotation: (arg0: { type: string; value: { completionTokens: number; promptTokens: number; totalTokens: number; }; }) => void; }) {
                  dataStream.writeMessageAnnotation({
                    type: 'usage',
                    value: {
                      completionTokens: cumulativeUsage.completionTokens,
                      promptTokens: cumulativeUsage.promptTokens,
                      totalTokens: cumulativeUsage.totalTokens,
                    },
                  });
                },
                onError: (error: any) => `Custom error: ${error.message}`,
              }),
            )
            .then(() => stream.close());
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

        console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        const result = await streamText({
          messages,
          env: context.cloudflare.env,
          options,
          apiKeys,
          files,
          providerSettings,
          promptId,
        });

        return stream.switchSource(result.toDataStream());
      },
    };

    const result = await streamText({
      messages,
      env: context.cloudflare.env,
      options,
      apiKeys,
      files,
      providerSettings,
      promptId,
    });

    stream.switchSource(result.toDataStream());

    return new Response(stream.readable, {
      status: 200,
      headers: {
        contentType: 'text/plain; charset=utf-8',
        projectId: project.$id,
        repositoryName: project.repositoryName,
      },
    });
  } catch (error: any) {
    console.error(error);

    if (error.message?.includes('API key')) {
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
