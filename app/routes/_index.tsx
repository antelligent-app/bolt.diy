import { json,type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { ProtectedView } from '~/components/ui/ProtectedView';
import React, { useEffect } from 'react';
import { useLoaderData } from '@remix-run/react';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export async function loader(args: LoaderFunctionArgs) {
  const request = args.request;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const create = url.searchParams.get('create');

  return json({
    id: id,
    create: create,
  });
}

export default function Index() {
  const { create } = useLoaderData<{ 
    create?: string,
  }>();

  useEffect(() => {
    if (create) {
      console.log('Index create:::', create);
    }
  }, [create]);
  return (
    <ProtectedView>
      <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
        <BackgroundRays />
        <Header />
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </div>
    </ProtectedView>
  );
}
