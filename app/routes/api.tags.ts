import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { v4 as uuidV4 } from 'uuid';
import axios from 'axios';
import { users, createTagDocument } from "~/lib/.server/appwrite-server";
import { ID, type Models } from "node-appwrite";
import { validateAuthHeaders } from "~/lib/.server/appwrite-server";


export async function action({
    request,
}: LoaderFunctionArgs) {
    const { 
        name, 
        userCanUseThisTag = false
    } = await request.json<{
        name: string,
        userCanUseThisTag: boolean
    }>();

    const { prefs, user } = await validateAuthHeaders(request);

    if(!user) {
        return json({error: 'User not found'}, {status: 404});
    }

    const userId = user.$id;

    if(user.labels.indexOf('admin') === -1) {
        return json({error: 'Unauthorized'}, {status: 403});
    }

    const tagRes = await createTagDocument({
        name,
        userId,
        userCanUseThisTag
    });
    return json(tagRes);
}


