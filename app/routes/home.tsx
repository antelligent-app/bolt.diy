import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_home';

export async function loader(args: LoaderFunctionArgs) {
  const request = args.request;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const create = url.searchParams.get('create');

  return json({
    id: id,
    isCodeMode: true,
    create: create,
  });
}

export default IndexRoute;
