
import { RelRW } from "./relrw.js"

export class Emitter {
    private _indent: number = 0
    // private _lines: string[] = []
    constructor(public readonly w: RelRW, private readonly path: string) {
        if (path.endsWith(".ts")) {
            this.line(`/* meta: { autogenerated: true } */`, false)
            this.line("/* eslint-disable */")
            this.line("/* This file has been automatically generated, please modify it via the codegen package */")
        }
    }

    indent() {
        this._indent++
    }

    dedent() {
        this._indent--
        this._indent = Math.max(0, this._indent)
    }

    line(s: string = ``, newline: boolean = true) {
        this.w.write(this.path, (newline ? "\n" : "") + "\t".repeat(this._indent) + s)
    }

    chars(s: string) {
        this.w.write(this.path, s)
    }

    close() {
        this.w.close(this.path)
    }
}
