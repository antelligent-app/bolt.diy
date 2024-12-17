import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { v4 as uuidV4 } from 'uuid';
import axios from 'axios';
import { users } from "~/lib/.server/appwrite-server";
import { ID, type Models } from "node-appwrite";


export async function action({
  request,
}: LoaderFunctionArgs) {
  const { email, password, name } = await request.json<{ 
    email: string,
    password: string,
    name: string
  }>();

  const giteaBaseUrl = process.env.GITEA_BASE_URL;
  const gitPassword = uuidV4();
  const gitUsername = uuidV4();

  const params = new URLSearchParams();
  params.append('user_name', gitUsername);
  params.append('email', email);
  params.append('password', gitPassword);
  params.append('retype', gitPassword);

  let user: Models.User<Models.Preferences>;

  try {
    user = await users.create(
      ID.unique(),
      email,
      undefined,
      password,
      name
    )
  } catch (error: any) {
    return new Response(JSON.stringify(error.response), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
  
  console.log('Calling: ', `${giteaBaseUrl}/user/sign_up`, {
    gitUsername,
    gitPassword
  })
  
  await axios.post(
    `${giteaBaseUrl}/user/sign_up`,
    params,
    {
      headers: {
        Cookie: 'lang=en-US; i_like_gitea=8e2779a79e7d3e28; _csrf=uBwdvQ2EKSS69kVzPIGOPI1OmoU6MTU5NDMxMTk2NzA1ODIxMjgzNw',
        "Content-Type": 'application/x-www-form-urlencoded'
      }
    }
  )

  await users.updatePrefs(user.$id, {
    gitCredentials: JSON.stringify({
      username: gitUsername,
      password: gitPassword
    })
  })

  return json({
    user
  });
}