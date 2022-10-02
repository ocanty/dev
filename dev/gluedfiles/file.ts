export interface FileMeta {
    sha256: string
    access: number
    data: Int8Array
}

export type FsDir = Record<string, FileMeta>