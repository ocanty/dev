
// https://nullprogram.com/blog/2018/07/31/
export function hashNum(x: number) {
    x ^= ((x|0) >> 17) | 0;
    x |= 0;
    x *= (0xed5ad4bb) | 0;
    x |= 0;
    x ^= (x >> 11) | 0;
    x |= 0;
    x *= 0xac4c1b51;
    x |= 0;
    x ^= (x >> 15) | 0;
    x |= 0;
    x *= 0x31848bab;
    x |= 0
    x ^= (x >> 14) | 0;
    x |= 0;
}

export async function sha256(s: string): Promise<string> {
    const utf8 = new TextEncoder().encode(s);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((bytes) => bytes.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
}