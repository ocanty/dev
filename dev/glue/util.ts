
import * as crypto from "crypto";
import * as fs from "fs";

export async function hashFile(hashKind: "sha256", path: string) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(hashKind);
    const stream = fs.createReadStream(path);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function eachChunk(path: string, onChunk: (b: Buffer) => void) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(path);
    stream.setEncoding("binary")
    stream.on('error', err => reject(err));
    stream.on('data', chunk => onChunk(chunk as Buffer));
    stream.on('end', () => resolve(undefined));
  });
}

