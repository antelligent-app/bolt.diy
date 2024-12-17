import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { json, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import { logStore } from './lib/stores/logs';
import { getDatabaseId, getMessagesCollectionId, getProjectsCollectionId } from './lib/.server/appwrite-server';

import 'virtual:uno.css';


export const loader = async () => {
  let APPWRITE_DATABASE_ID;
  let APPWRITE_PROJECTS_COLLECTION_ID;
  let APPWRITE_MESSAGES_COLLECTION_ID;
  const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT;
  const GITEA_BASE_URL = process.env.GITEA_BASE_URL;
  try {
    APPWRITE_DATABASE_ID = await getDatabaseId()
    APPWRITE_PROJECTS_COLLECTION_ID = await getProjectsCollectionId()
    APPWRITE_MESSAGES_COLLECTION_ID = await getMessagesCollectionId()
  } catch (error) {
    console.log('Error fetching apppwrite database details: ', error);
  }
  return json({
    ENV: {
      APPWRITE_DATABASE_ID,
      APPWRITE_PROJECTS_COLLECTION_ID,
      APPWRITE_MESSAGES_COLLECTION_ID,
      APPWRITE_PROJECT,
      GITEA_BASE_URL,
    }
  });
};

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);
  const data = useLoaderData<typeof loader>();


  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
    document.querySelector('html')?.setAttribute('data-appwrite-project', data.ENV.APPWRITE_PROJECT || '');
    document.querySelector('html')?.setAttribute('data-appwrite-database-id', data.ENV.APPWRITE_DATABASE_ID || '');
    document.querySelector('html')?.setAttribute('data-appwrite-projects-collection-id', data.ENV.APPWRITE_PROJECTS_COLLECTION_ID || '');
    document.querySelector('html')?.setAttribute('data-appwrite-messages-collection-id', data.ENV.APPWRITE_MESSAGES_COLLECTION_ID || '');
    document.querySelector('html')?.setAttribute('data-gitea-base-url', data.ENV.GITEA_BASE_URL || '');
  }, [theme]);

  return (
    <>
      {children}
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return (
    // <Layout>
      <Outlet />
    // </Layout>
  );
}
