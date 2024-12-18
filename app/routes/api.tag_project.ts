import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { v4 as uuidV4 } from 'uuid';
import axios from 'axios';
import { users, updateProjectTags, getTagsByNames } from "~/lib/.server/appwrite-server";
import { ID, type Models } from "node-appwrite";


export async function action({
    request,
}: LoaderFunctionArgs) {
    const { projectId, tagName, userId } = await request.json<{
        projectId: string,
        tagName: string,
        userId: string
    }>();

    const tagRes = await updateProjectTags(projectId, userId, [tagName]);
    return json(tagRes);
}


