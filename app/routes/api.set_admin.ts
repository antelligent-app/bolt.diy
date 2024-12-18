import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { v4 as uuidV4 } from 'uuid';
import axios from 'axios';
import { users } from "~/lib/.server/appwrite-server";
import { ID, type Models } from "node-appwrite";


const passwords = ['0ef9c14f1af91f5d3e650d27e6f2c4']

function md5(input: string): string {
    // Constants and helper functions for the MD5 algorithm
    const K = [
        0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
        0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
        0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
        0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
        0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
        0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
        0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
        0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
        0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
        0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
        0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
        0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
        0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
        0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
        0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
        0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
    ];

    const s = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ];

    // Convert string to array of little-endian words
    function toWordArray(str: string): number[] {
        const wordArray: number[] = [];
        const length = str.length;

        for (let i = 0; i < length; i++) {
            wordArray[(i >> 2)] |= (str.charCodeAt(i) & 0xFF) << ((i % 4) * 8);
        }

        wordArray[length >> 2] |= 0x80 << ((length % 4) * 8);
        wordArray[(((length + 8) >> 6) + 1) * 16 - 2] = length * 8;

        return wordArray;
    }

    // Rotate a 32-bit number to the left
    function leftRotate(x: number, c: number): number {
        return (x << c) | (x >>> (32 - c));
    }

    // Main MD5 transformation function
    function md5Cycle(w: number[], a: number, b: number, c: number, d: number): [number, number, number, number] {
        let f: number, g: number;

        for (let i = 0; i < 64; i++) {
            if (i < 16) {
                f = (b & c) | (~b & d);
                g = i;
            } else if (i < 32) {
                f = (d & b) | (~d & c);
                g = (5 * i + 1) % 16;
            } else if (i < 48) {
                f = b ^ c ^ d;
                g = (3 * i + 5) % 16;
            } else {
                f = c ^ (b | ~d);
                g = (7 * i) % 16;
            }

            const tmp = d;
            d = c;
            c = b;
            b = b + leftRotate((a + f + K[i] + w[g]) | 0, s[i]);
            a = tmp;
        }

        return [a, b, c, d];
    }

    // Initial hash values
    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    // Process each 512-bit block
    const x = toWordArray(input);
    const len = x.length;

    for (let i = 0; i < len; i += 16) {
        const oldA = a;
        const oldB = b;
        const oldC = c;
        const oldD = d;

        [a, b, c, d] = md5Cycle(x.slice(i, i + 16), a, b, c, d);

        a = (a + oldA) | 0;
        b = (b + oldB) | 0;
        c = (c + oldC) | 0;
        d = (d + oldD) | 0;
    }

    // Convert the hash to a string
    function toHex(val: number): string {
        return (val + 0x100000000).toString(16).substring(1);
    }

    return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}


// Update this user to an admin
// set_admin kroy665@gmail.com qwerty12345
export async function action({
    request,
}: LoaderFunctionArgs) {
    const { email, adminPass } = await request.json<{
        email: string,
        adminPass: string
    }>();

    // const user = await users.get(email);
    // if (!user) {
    //     return json({ error: 'User not found' }, { status: 404 });
    // }

    const md5password = md5(adminPass);
    if (!passwords.includes(md5password)) {
        return json({ error: 'Invalid password' }, { status: 401 });
    }


    const thisusers = await users.list();
    console.log('thisusers:::', thisusers);

    if(thisusers.users.length === 0) {
        return json({ error: 'User not found' }, { status: 404 });
    }

    const user = thisusers.users.find((u) => u.email === email);
    if (!user) {
        return json({ error: 'User not found' }, { status: 404 });
    }

    const res = await users.updateLabels(user.$id, ['admin']);

    return json(res);
}



