
import * as fs from "fs"
import * as path from "path"

/**
 * Relative Reader-Writer
 */
export class RelRW {
    private constructor(private basePath: string) {}

    private seen: Record<string, number> = {}

    static make(basePath: string) {
        const wf = new RelRW(basePath)
        
        const baseRealPath = fs.realpathSync(wf.basePath)
        const basepathExists = wf.exists(baseRealPath)

        if (!basepathExists) {
            throw new Error("base path does not exist.")
        }

        wf.basePath = baseRealPath
        return wf
    }

    exists(path: string) {
        try {
            fs.accessSync(path)
            return true
        } catch (e) {
            // console.log(e)
            return false
        }
    }

    private ensureDirExists(filePath: string) {
        var dirname = path.dirname(filePath);

        if (fs.existsSync(dirname)) {
            return true;
        }

        this.ensureDirExists(dirname);

        console.log(`Creating directory ${dirname}`)
        fs.mkdirSync(dirname);
    }

    private absPath(relPath: string) {
        return path.join(this.basePath, relPath)
    }

    listDir(relPath: string, ext: string = ""): string[] {
        const files = fs.readdirSync(this.absPath(relPath), { withFileTypes: true })

        return files.filter(f => f.isFile()).map(f => f.name).filter(f => f.endsWith(ext))
    }

    read(relPath: string): string {
        return fs.readFileSync(relPath, { encoding: "utf-8"} )
    }

    write(relPath: string, s: string) {
        const filePath = this.absPath(relPath)

        if (!(filePath in this.seen)) {
            this.ensureDirExists(filePath)
            const fd = fs.openSync(filePath, "w+")
            this.seen[filePath] = fd
        }

        fs.appendFileSync(this.seen[filePath], s)

        // fs.appe(filePath, s)
        // console.log(`appending ${s} to ${filePath}`)
    }

    close(path: string) {
        if (path in this.seen) {
            try {
                fs.closeSync(this.seen[path])
            } catch (err) {
                console.warn(`Error closing fd: (${path}, ${this.seen[path]}): ${err}`)
            }

            delete this.seen[path]
        }
    }
}