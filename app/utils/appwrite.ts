import { Client, Account } from "appwrite";

const client = new Client();
const account = new Account(client);

client
  .setEndpoint("https://cloud.appwrite.io/v1") // Replace with your Appwrite endpoint
  .setProject("6739490b003e1f88b976"); // Replace with your Appwrite project ID

export { client, account };