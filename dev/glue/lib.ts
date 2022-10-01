import * as fs from "fs"
import path from "path"
import * as lock from "proper-lockfile"


// TODO(ocanty) writer interface

class SpecBuilder {
    ctx: {
        namespace?: {
            id: number
            types?: {
                model?: {
                    id: number
                    fields?: {
                        id: number
                    }
                },
                enum?: { id: number }
            },
            services?: {
                service?: {
                    id: number,
                    method?: number
                }
            }
        }

    } & Record<string, any> = {}

    spec: Record<string, Namespace> = {}

    namespace(id: number, name: string) {
        this.spec[id] = this.spec[id] || { name: "whatever", types: {}, services: {} }
        this.spec[id].name = name


        this.ctx = { namespace: { id } }
        return this
    }

    files(path: string) {
        if (this.ctx?.namespace == undefined) throw this.bad()
        this.spec[this.ctx.namespace.id].files = path
        return this
    }

    types() {
        if (this.ctx?.namespace == undefined) throw this.bad()
        this.ctx.namespace = { id: this.ctx.namespace.id, types: {} }
        return this
    }

    model(id: number, name: string) {
        if (this.ctx?.namespace?.types == undefined) throw this.bad()
        this.spec[this.ctx.namespace.id].types[id] = {
            name, fields: {}, enum: false, meta: {}
        }
        this.ctx.namespace.types = { model: { id } }
        return this
    }

    db() {
        if (this.ctx?.namespace?.types?.model == undefined) throw this.bad()

        this.spec[this.ctx.namespace.id].types[this.ctx.namespace.types.model.id].meta.db = {}

        return this
    }

    field(id: number, name: string, type: Type, meta: FieldMeta = {}) {
        if (this.ctx?.namespace?.types?.model == undefined) throw this.bad()

        this.spec[this.ctx.namespace.id].types[this.ctx.namespace.types.model.id].fields[id] = {
            name, type, meta
        }

        this.ctx.namespace.types.model = {
            id: this.ctx.namespace.types.model.id,
            fields: { id }
        }

        return this
    }

    // id(prefix: string, type: FieldMetaIdType = {}) {
    //     if (this.ctx?.namespace?.types?.model?.fields == undefined) throw this.bad()


    //     this.spec[this.ctx.namespace.id]
    //     .types[this.ctx.namespace.types.model.id]
    //     .fields[this.ctx.namespace.types.model.fields.id].meta.id = {
    //         prefix, type
    //     }

    //     return this
    // }

    // pii(type: PII) {
    //     if (this.ctx?.namespace?.types?.model?.fields == undefined) throw this.bad()

    //     this.spec[this.ctx.namespace.id]
    //     .types[this.ctx.namespace.types.model.id]
    //     .fields[this.ctx.namespace.types.model.fields.id].meta.pii = type

    //     return this
    // }

    enum(id: number, name: string) {
        if (this.ctx?.namespace?.types == undefined) throw this.bad()
        this.spec[this.ctx.namespace.id].types[id] = {
            name, fields: {}, enum: true, meta: {}
        }
        this.ctx.namespace.types = {
            enum: { id }
        }
        return this
    }

    value(id: number, name: string, type: Type, meta: FieldMeta = {}) {
        if (this.ctx?.namespace?.types?.enum == undefined) throw this.bad()

        this.spec[this.ctx.namespace.id].types[this.ctx.namespace.types.enum.id].fields[id] = {
            name, meta,
            type: Nullable(type)
        }

        return this
    }

    services() {
        if (this.ctx?.namespace == undefined) throw this.bad()
        this.ctx.namespace = { id: this.ctx.namespace.id, services: {} }
        return this
    }

    service(id: number, name: string, head: ServiceHead) {
        if (this.ctx?.namespace?.services == undefined) throw this.bad()
        this.ctx.namespace.services = {
            service: { id }
        }

        this.spec[this.ctx.namespace.id].services[id] = {
            name, ...head, methods: {}
        }

        return this
    }

    method(id: number, name: string, params: Type, returns: Type) {
        if (this.ctx?.namespace?.services?.service == undefined) throw this.bad()


        this.spec[this.ctx.namespace.id].services[this.ctx.namespace.services.service.id].methods[id] = {
            name, params, returns
        }

        return this
    }

    private bad() {
        return new Error("invalid ctx")
    }

    async build(root: string) {
        await new WSpec(this.spec).build(root)
    }
}

const RpcNsId = 0
const RpcNsName = "rpc"

export function Spec() {
    return new SpecBuilder().
        namespace(RpcNsId, RpcNsName)
            .types()
                .model(0, "request")
                    .field(0, "version", Int32())
                    .field(1, "id", Str())
                    .field(2, "namespace", Int32())
                    .field(3, "service", Int32())
                    .field(4, "method", Int32())
                    .field(5, "params", Any())
                .model(1, "response")
                    .field(0, "version", Int32())
                    .field(1, "id", Str())
                    .field(2, "result", Types(`${RpcNsName}/result`))
                .model(2, "error")
                    .field(0, "code", Int32())
                    .field(1, "message", Str())
                .enum(3, "result")
                    .value(0, "error", Types(`${RpcNsName}/error`))
                    .value(1, "ok", Any())
        
}

export enum  PII {
    ANY_PII = 0,
    EMAIL = 1,
    FIRST_NAME = 2,
    LAST_NAME = 3
}

export interface TypeBaseMeta {
    pii?: PII
}

export interface TypeBoolMeta extends TypeBaseMeta { }

export interface TypeBool {
    id: "bool"
    meta?: TypeBoolMeta
}

interface IDMetaAttr {
    type?: "primary" | "sharded" | "rel"
    rel?: TypeNamedRef
}

interface IDMeta {
    prefix: string
    attr?: IDMetaAttr
}

export interface TypeStrMeta extends TypeBaseMeta {
    id?: IDMeta
}

export interface TypeStr {
    id: "str"
    meta?: TypeStrMeta
}


export interface TypeAny {
    id: "any"
}

export interface TypeInt32Meta extends TypeBaseMeta {
    min?: number
    max?: number
}

export interface TypeInt32 {
    id: "int32"
    meta?: TypeInt32Meta
}

export interface TypeDictMeta extends TypeBaseMeta { }

export interface TypeDict {
    id: "dict"
    contains: Type
    meta?: TypeDictMeta
}

export interface TypeRaw {
    id: "raw"
}

export interface TypeAny {
    id: "any"
}

export interface TypeNullable {
    id: "nullable"
    contains: Type
}

export interface TypeArrayMeta extends TypeBaseMeta {
    min?: number
    max?: number
}

export interface TypeArray {
    id: "array"
    contains: Type
    meta?: TypeArrayMeta
}

export interface TypeStreaming {
    id: "streaming"
    contains: Type
}

export type TypeFinal = TypeStr | TypeBool | TypeInt32 | TypeDef | TypeNamedRef | TypeAny | TypeRaw | TypeAny
export type TypeStateModifier = TypeStreaming
export type TypeContainer = TypeDict | TypeArray | TypeNullable | TypeStateModifier
export type Type = TypeContainer | TypeFinal

export interface TypeDef {
    id: "def"
    nsId: string
    typeId: string
}

export interface TypeNamedRef {
    id: "namedRef"
    ref: string
}

export interface Field {
    name: string
    type: Type
    meta: FieldMeta
}

interface TypeDefMetaDb {
    
}

interface TypeDefMeta {
    db?: TypeDefMetaDb 
}

export interface Def {
    name: string
    enum: boolean
    fields: Record<number, Field>
    meta: TypeDefMeta
}

export interface Enum {
    name: string
    fields: Record<number, Field>
}

export interface Types {
    name: string
    defs: Record<number, Def>
}

export interface Namespace {
    name: string
    types: Record<string, Def>
    services: Record<string, Service>
    files?: string
}

export interface FieldMeta {
    deprecated?: boolean
}

export function Bool(meta?: TypeBoolMeta): TypeBool {
    return { id: "bool", meta }
}

export function Raw(): TypeRaw {
    return { id: "raw" }
}

export function Any(): TypeAny {
    return { id: "any" }
}

export function Str(meta?: TypeStrMeta): TypeStr {
    return { id: "str", meta }
}

export function Nullable(contains: Type): TypeNullable {
    return { id: "nullable", contains }
}

export function Int32(meta?: TypeInt32Meta): TypeInt32 {
    return { id: "int32", meta }
}

export function Array(contains: Type, meta?: TypeArrayMeta): TypeArray {
    return { id: "array", contains, meta }
}

export function Dict(contains: Type, meta?: TypeDictMeta): TypeDict {
    return { id: "dict", contains, meta }
}

// "Special" types

export function ID(prefix: string, attr?: IDMetaAttr): TypeStr {
    return {
        id: "str",
        meta: {
            id: {
                prefix,
                attr
            }
        }
    }
}

export function Types(id: string): TypeNamedRef {
    return {
        id: "namedRef",
        ref: id
    }
}

export function Streaming(t: TypeNamedRef): TypeStreaming {
    return {
        id: "streaming", contains: t
    }
}

export type TargetID = "go" | "ts" | "sql" | "svcmanifest"

export interface ServiceHead {
    description?: string
    config: Type
}

export interface Service extends ServiceHead {
    name: string
    methods: Record<number, Method>
}

export interface Method {
    name: string
    params: Type
    returns: Type
}


interface Writer {
    write(path: string, s: string): void
    close(path: string): void
}

class WriterFile implements Writer {

    private constructor(private basePath: string) {}

    private seen: Record<string, number> = {}

    static make(basePath: string) {
        const wf = new WriterFile(basePath)

        const baseRealPath = fs.realpathSync(wf.basePath)
        const basepathExists = wf.exists(baseRealPath)

        if (!basepathExists) {
            throw new Error("base path does not exist.")
        }

        wf.basePath = baseRealPath
        return wf
    }

    private exists(path: string) {
        try {
            fs.accessSync(path)
            return true
        } catch (e) {
            return false
        }
    }

    write(relPath: string, s: string) {
        const filePath = path.join(this.basePath, relPath)

        if (!(filePath in this.seen)) {
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

export class WSpec {
    private types: Record<string, [string, string, Def]> = {}
    private methods: Record<string, Method> = {}
    private dependsOn: Record<string, Record<string, Namespace>> = {}

    constructor(
        readonly namespaces: Record<string, Namespace>
    ) {
        this.indexBuild()
        this.nsDepsGraphBuild()
    }

    // Returns all the dependencies that a namespace has
    public nsDeps(nsId: string): Record<string, Namespace> {
        if (nsId in this.dependsOn) {
            return this.dependsOn[nsId]
        }

        return {}
    }


    // Returns the TypeNamedRef in a type if it has one
    private typeHasTypeNamedRef(t: Type): TypeDef | undefined {
        if (t.id == "namedRef") {
            return this.typeResolveNamedRef(t)
        }

        if ("contains" in t) {
            return this.typeHasTypeNamedRef(t.contains)
        }

        // undefined
    }

    typeResolveNamedRef(t: TypeNamedRef): TypeDef {
        if (this.types[t.ref] == undefined) {
            throw new Error(`could not resolve named type reference ${t.ref}`)
        }

        const [nsId, modelNo, type] = this.types[t.ref]

        return {
            id: "def",
            nsId,
            typeId: modelNo
        }

    }

    typeIsDef(t: Type): TypeDef | undefined {
        if (t.id == "def") {
            return t
        } else if (t.id == "namedRef") {
            return this.typeResolveNamedRef(t)
        }
    }

    // typeDefsResolveType(t: TypeDef): Def {
    //     return this.
    // }

    // Mark that namespace originNsId depends on targetNsId
    private nsDependsOn(originNsId: string, targetNsId: string) {
        if (originNsId === targetNsId) return

        this.dependsOn[originNsId] = this.dependsOn[originNsId] || {}
        this.dependsOn[originNsId][targetNsId] = this.namespace(targetNsId)
    }

    // Generate an index and dependency graph for the spec
    private indexBuild() {
        this.types = {}
        this.dependsOn = {}
        this.methods = {}

        for (const [nsId, ns] of Object.entries(this.namespaces)) {
            const keyName = (s: string) => {
                return ns.name + "/" + s
            }

            for (const [typeId, type] of Object.entries(ns.types)) {
                this.types[keyName(type.name)] = [nsId, typeId, type]
            }
        }
    }



    private nsDepsGraphBuild() {
        const checkAndMarkDep = (t: Type, originNsId: string) => {
            const tNR = this.typeHasTypeNamedRef(t)
            if (tNR) {
                this.nsDependsOn(originNsId, tNR.nsId)
            }
        }

        for (const [nsId, ns] of Object.entries(this.namespaces)) {
            for (const [typeId, type] of Object.entries(ns.types)) {
                for (const [fieldId, f] of Object.entries(type.fields)) {
                    checkAndMarkDep(f.type, nsId)
                }
            }

            for (const [svcId, svc] of Object.entries(ns.services)) {
                checkAndMarkDep(svc.config, nsId)

                for (const [methodId, method] of Object.entries(svc.methods)) {
                    checkAndMarkDep(method.params, nsId)
                    checkAndMarkDep(method.returns, nsId)
                }
            }

            // Make every namespace depend on the RPC namespace
            if (nsId != RpcNsId.toString()) {
                this.nsDependsOn(nsId, RpcNsId.toString())
            }
        }

        // TODO(ocanty) Check for circular dependencies by topologically sorting
    }

    namespaceName(namespaceId: string): string {
        const s = this.namespaces[namespaceId].name
        if (!s) {
            throw new Error(`no namespace ${namespaceId}`)
        }
        return s
    }

    namespace(namespaceNo: string): Namespace {
        const ret = this.namespaces[namespaceNo]
        if (!ret) {
            throw new Error(`no such namespace ${ret}`)
        }
        return ret
    }



    modelDef(namespaceNo: string, modelNo: string): Def {
        const n = this.namespace(namespaceNo)
        const model = n.types?.[modelNo]
        if (!model) {
            throw new Error(`no such modeldef (${namespaceNo},${modelNo})`)
        }
        return model
    }


    async build(path: string) {
        const n = new Date()
        console.log("Starting build!")

        let release = () => {}

        try {
            release = await lock.lock("dist")

            for(const t of [
                new TargetTS(this, WriterFile.make(path)),
                new TargetSQL(this, WriterFile.make(path))
            ]) {
                t.emit()
            }

            console.log(`Build finished in ${(new Date().getMilliseconds() - n.getMilliseconds())/1000} seconds`)
            release()
        } catch (err) {
            console.log(`Build failed in ${(new Date().getMilliseconds() - n.getMilliseconds())/1000} seconds: ${err}`)
        } finally {
            if (await lock.check("dist")) {
                release()
            }
        }
    }
}

function title(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function randomString(): string {
    return (Math.random() + 1).toString(36).substring(16)
}

interface Target {
    // should dump the files to the basePath
    emit(): void

    targetId: TargetID
}

interface SQLEmitCtx {
    em: Emitter
    nsId?: string
    ns?: Namespace
}

class TargetSQL implements Target {
    targetId: TargetID = "sql"

    constructor(
        private readonly s: WSpec,
        private readonly w: Writer
    ) {
        
    }

    private emitManifest(path: string) {
        let manifestEm = new Emitter(this.w, path)
        for (const [nsId, ns] of Object.entries(this.s.namespaces)) {
            manifestEm.line(`export * as ${title(ns.name)} from "./${nsId}"`)
            manifestEm.line(`export * as _ns_${nsId} from "./${nsId}"`)
        }
        manifestEm.close() 
    }



    private emitCtx(path: string, nsId: string, ns: Namespace): SQLEmitCtx {
        return {
            em: new Emitter(this.w, path), nsId, ns
        }
    }

    emit(): void {
       this.emitManifest("./glueddb/sql/manifest.ts")
        
        for (const [nsId, ns] of Object.entries(this.s.namespaces)) {
            let sCtx = this.emitCtx(`./glueddb/sql/${nsId}.ts`, nsId, ns)

            sCtx.em.line("--global['_blahblah']; export default`")

            for (const [tId, t] of Object.entries(ns.types)) {
                if (t.meta.db) {
                    this.emitModel(sCtx, tId, t)
                }
            }

            sCtx.em.line("--`")
            sCtx.em.close()
        }


    }

    /**
     * Collapse all the fields in an expression 
     */
    private flattenFields(t: Def): Record<string, Field> {
        const ret: Record<string, Field> = {}

        // const visitor = (t: Def, f: string, prefix: string = ""): void => {
        //     for (const [fId, f] of Object.entries(t.fields)) {
                
        //         const m = this.s.typeIsDef(f.type)

        //         if (m) {

        //             visitor(m)
        //         } else {
        //             ret[`${prefix}${fId}`] = f
        //         } 
        //     }
        // }

        // visitor(t)

        return ret
    }

    emitModel(c: SQLEmitCtx, tId: string, t: Def) {
        if (t.enum) return

        const tblName = `GLUE_${c.nsId}_${tId}`
        c.em.line(`CREATE TABLE IF NOT EXISTS ${tblName} ();`)

        for (const [fId, f] of Object.entries(t.fields)) {
            
            c.em.line(`ALTER TABLE ${tblName} ADD COLUMN ${fId} ${this.type(c, f.type)};`) 
        }
    }

    private type(c: SQLEmitCtx, t: Type, isNull: boolean = false): string {
        let type = ""

        switch (t.id) {
            case "any":
            case "streaming":
            case "namedRef":
            case "raw":
            case "array":
            case "dict":
                throw new Error(`${t.id} is not allowed in table rows`)

            case "def":
                throw new Error(`${t.id} table should be flattened`)

            case "bool":
                type += `BOOLEAN DEFAULT(${this.default(c,t)})`
                break

            case "str":
                type += `TEXT DEFAULT(${this.default(c,t)})`
                break

            case "nullable":
                return this.type(c, t.contains, true)

            case "int32":
                type += `INT32 DEFAULT(${this.default(c,t)})`
                break
        }

        return isNull ? type : `${type} NOT NULL `
    }

    private default(c: SQLEmitCtx, t: Type) {
        let type = ""

        switch (t.id) {
            case "any":
            case "streaming":
            case "namedRef":
            case "raw":
            case "array":
            case "dict":
                throw new Error(`${t.id} is not allowed in table rows`)

            case "def":
                throw new Error(`${t.id} table should be flattened`)

            case "bool":
                return "False"

            case "str":
                return "''"

            case "nullable":
                return "NULL"

            case "int32":
                return "0"
        }
    }
}

interface TSEmitCtx {
    em: Emitter
    pkg?: "glued" | "gluedrpcclient" | "gluedrpcserver" | "gluedfiles"
    nsId?: string
    ns?: Namespace
}

class TargetTS implements Target {
    targetId: TargetID = "ts"

    constructor(
        private readonly s: WSpec,
        private readonly w: Writer
    ) { }

    emitDepImports(c: TSEmitCtx) {
        if (c.nsId == undefined) {
            throw new Error("need to be in a namespace to emit its dependencies")
        }

        const deps = this.s.nsDeps(c.nsId)

        for (const [nsId, ns] of Object.entries(deps)) {
            if (c.pkg !== "glued") {
                c.em.line(`import { _ns_${nsId} } from "@dev/glued"`)
            } else {
                c.em.line(`import * as _ns_${nsId} from "./${nsId}"`)
            }
        }

        // Need to import self definitions
        if (c.pkg !== "glued") {
            c.em.line(`import { _ns_${c.nsId } } from "@dev/glued"`)
        }
    }

    private emitCtx(path: string, pkg: "glued" | "gluedrpcclient" | "gluedrpcserver" | "gluedfiles", nsId: string, ns: Namespace): TSEmitCtx {
        const em = new Emitter(this.w, path)
        em.line("export {}")
        return {
            em, nsId, pkg, ns
        }
    }

    emit() {
        this.emitManifest("./glued/ts/manifest.ts")
        this.emitManifest("./gluedrpcserver/ts/manifest.ts")
        this.emitManifest("./gluedrpcclient/ts/manifest.ts")
        this.emitManifest("./gluedfiles/ts/manifest.ts")

        for (const [nsId, ns] of Object.entries(this.s.namespaces)) {
            // Models + RPC
            let gCtx = this.emitCtx(`./glued/ts/${nsId}.ts`, "glued", nsId, ns)
            let cCtx = this.emitCtx(`./gluedrpcclient/ts/${nsId}.ts`, "gluedrpcclient", nsId, ns)
            let sCtx = this.emitCtx(`./gluedrpcserver/ts/${nsId}.ts`, "gluedrpcserver", nsId, ns)

            cCtx.em.line(`import { Client as BaseClient } from "../client"`)
            sCtx.em.line(`import { Server as BaseServer } from "../server"`)

            gCtx.em.line(`import * as _M from "../model"`)
            this.emitDepImports(gCtx)
            for (const [tId, t] of Object.entries(ns.types)) {
                this.emitType(gCtx, tId, t)
            }

            for (const [svcId, svc] of Object.entries(ns.services)) {
                this.emitSvcInterface(gCtx, svcId, svc)

                this.emitDepImports(cCtx)
                this.emitSvcClient(cCtx, svcId, svc)

                this.emitDepImports(sCtx)

            }

            // Files
            let fCtx = this.emitCtx(`./gluedfiles/ts/${nsId}.ts`, "gluedfiles", nsId, ns)
            //await this.emitFiles(fCtx, nsId, ns)

            let _ = [gCtx,cCtx,sCtx,gCtx,fCtx].forEach((c) => c.em.close())
        }
    }

    private emitManifest(path: string) {
        let manifestEm = new Emitter(this.w, path)
        for (const [nsId, ns] of Object.entries(this.s.namespaces)) {
            manifestEm.line(`export * as ${title(ns.name)} from "./${nsId}"`)
            manifestEm.line(`export * as _ns_${nsId} from "./${nsId}"`)
        }
        manifestEm.close()
    }

    private async emitFiles(c: TSEmitCtx, nsId: string, ns: Namespace) {
        if (!ns.files) return

        // const files = await fsp.readdir(ns.files)
        // c.em.line(`import { FileMeta } from "../file"`)
        // c.em.line(`const files: Record<string, FileMeta> = {`)
        // c.em.indent()

        // for (const f of files) {
        //     const filePath = await path.join(ns.files, f)
        //     const stat = await fsp.stat(filePath)

        //     if (!stat.isFile()) continue
        //     // <RACE CONDITION>

        //     const sha = await hashFile("sha256", filePath)
        //     c.em.line(`"${f}": {`)
        //     c.em.indent()
        //     c.em.line(`sha256: "${sha}",`)
        //     c.em.line(`access: 0o${'0' + (stat.mode & parseInt('777', 8)).toString(8)},`)
        //     c.em.line(`data: new Int8Array([`)
            
        //     await eachChunk(filePath, (b: Buffer) => {
        //         for (let i = 0; i < b.length; i++) {
        //             c.em.chars(`${b[i]},`)
        //         }
        //     })

        //     c.em.line(`])`)
        //     c.em.dedent()
        //     c.em.line(`}`)
        // }

        // c.em.dedent()
        // c.em.line(`}`)
        // c.em.line(`export default files`)
    }

    private svcMethodSignature(c: TSEmitCtx, m: Method) {
        if (m.params.id == "streaming") {
            return `${m.name}(): Promise<void>`

        } else {
            return `${m.name}(p: ${this.type(c, m.params, "class")}): Promise<${this.type(c, m.returns, "class")}>`
        }
    }

    private emitSvcInterface(c: TSEmitCtx, svcId: string, svc: Service) {
        c.em.line(`export interface Svc${title(svc.name)} {`)
        c.em.indent()

        for (const [_, m] of Object.entries(svc.methods)) {
            c.em.line(
                this.svcMethodSignature(c, m)
            )
        }

        c.em.dedent()
        c.em.line(`}`)
        c.em.line()
        c.em.line(`export type _svc_${svcId} = Svc${title(svc.name)}`)

    }

    // private svcServer(s: Defs, em: Emitter, svcNo: string, svc: Service)  {
    //     c.em.line(`export class ${title(svc.id)}Server extends RpcServer {`)
    //     c.em.indent()

    //     c.em.line(`constructor(host: string, port: number, )`)
    // }

    private emitSvcClient(c: TSEmitCtx, svcId: string, svc: Service) {
        c.em.line(`export class Client extends BaseClient implements _ns_${c.nsId}._svc_${svcId} {`)
        c.em.indent()
        c.em.line(`constructor(remote: string) {`)
        c.em.indent()
        c.em.line(`super(remote)`)
        c.em.dedent()
        c.em.line(`}`)

        for (const [mId, m] of Object.entries(svc.methods)) {
            this.emitSvcClientMethod(c, svcId, mId, m)
        }

        c.em.dedent()
        c.em.line(`}`)
    }

    private emitSvcClientMethod(c: TSEmitCtx, svcId: string, mId: string, m: Method) {
        c.em.line(`async ${this.svcMethodSignature(c, m)} {`)
        c.em.indent()

        if (m.params.id == "streaming") {

        } else {
            c.em.line(`const ret = new ${this.type(c, m.returns, "class")}()`)

            c.em.line(`const resp = (await this.request(new _ns_${RpcNsId}.Request({`)
            c.em.indent()
            c.em.line(`namespace: ${c.nsId}, `)
            c.em.chars(`service: ${svcId}, `)
            c.em.chars(`method: ${mId},`)
            c.em.line(`params: p._marshalFields()`)
            c.em.dedent()
            c.em.line(`}))).result`)
            c.em.line()
            c.em.line(`ret._unmarshalFields(resp)`)
            c.em.line()
            c.em.line(`return ret`)
        }
        
        c.em.dedent()
        c.em.line(`}`)
    }

    private emitType(c: TSEmitCtx, mId: string, m: Def) {
        if (!c.nsId) {
            throw new Error("namespace context required")
        }

        const mType: TypeDef = {
            id: "def",
            nsId: c.nsId,
            typeId: mId
        }

        c.em.line(`interface ${this.type(c, mType, "interface")} {`)
        c.em.indent()

        for (const [fId, f] of Object.entries(m.fields)) {
            c.em.line(`${f.name}: ${this.type(c, f.type, "interface")}`)
        }

        c.em.dedent()
        c.em.line(`}`)
        c.em.line()

        c.em.line(`export class ${this.type(c, mType, "class")} `)
        c.em.chars(`extends _M.Model implements ${this.type(c, mType, "interface")} {`)
        c.em.indent()

        c.em.line(`constructor(o?: _M.DeepPartial<${this.type(c, mType, "interface")}>) {`)
        c.em.indent()
        c.em.line(`super("${c.nsId}/${mType.typeId}", ${this.type(c, mType, "class")}.fieldTool, o)`)
        c.em.dedent()
        c.em.line(`}`)

        for (const [fieldId, field] of Object.entries(m.fields)) {
            c.em.line(`${field.name}!: ${this.type(c, field.type, "class")}`)
        }

        c.em.line(`static fieldTool = _M.FieldTools.model(() => new ${this.type(c, mType, "class")}())`)
        c.em.indent()
        
        for (const [fieldId, field] of Object.entries(m.fields)) {
            c.em.line(`.field("${fieldId}", "${field.name}", ${this.type(c, field.type, "fieldTools")})`)
        }

        c.em.dedent()

        if (m.enum) {
            for (const [fieldId, field] of Object.entries(m.fields)) {
                if (field.type.id == "nullable") {
                    c.em.line(`static ${title(field.name)}(p: ${this.type(c, field.type.contains, "interface")}) {`)
                    c.em.indent()
                    c.em.line(`return new ${this.type(c, mType, "class")}({ ${field.name}: p })`)
                    c.em.dedent()
                    c.em.line(`}`)
                }
            }
        }

        c.em.dedent()
        c.em.line('}')
        c.em.line()
        c.em.line(`export const _model_${mId} = ${this.type(c, mType, "class")}`)
        c.em.line()

    }

    // private typeEqual(t1: Type, t2: Type): boolean {
    //     if (t1.id !== t2.id) {
    //         return false
    //     }

    //     switch (t1.id) {
    //         case "def":
    //             return this.typeModelEqual(t1, t2 as TypeModel)

    //         default:
    //             return true
    //     }
    // }

    // private typeModelEqual(t1: TypeModel, t2: TypeModel): boolean {
    //     return t1.typeId == t1.typeId && t2.packageId == t2.packageId
    // }

    private type(
        c: TSEmitCtx,
        t: Type,
        modelMode: "class" | "interface" | "fieldTools" = "class",
    ): string {
        let fieldTools: boolean = modelMode === "fieldTools"

        switch (t.id) {
            case "any":
                return !fieldTools ? `any` : "() => _M.FieldTools.any"

            case "streaming":
                return this.type(c, t.contains)

            case "raw":
                return !fieldTools ? `string` : "() => _M.FieldTools.raw"

            case "bool":
                return !fieldTools ? "boolean" : "() => _M.FieldTools.bool"

            case "str":
                return !fieldTools ? "string" : "() => _M.FieldTools.str"

            case "nullable":
                return !fieldTools
                    ? "_M.Nullable<" + this.type(c, t.contains, modelMode) + ">"
                    : "() => _M.FieldTools.nullable(" + this.type(c, t.contains, modelMode) + ")"

            case "int32":
                return !fieldTools ? "number" : "() => _M.FieldTools.int32"

            case "array":
                return !fieldTools
                    ? "Array<" + this.type(c, t.contains, modelMode) + ">"
                    : "() => _M.FieldTools.array(" + this.type(c, t.contains, modelMode) + ")"

            case "dict":
                return !fieldTools
                    ? "Record<string," + this.type(c, t.contains, modelMode) + ">"
                    : "() => _M.FieldTools.dict(" + this.type(c, t.contains, modelMode) + ")"

            case "namedRef":
                return this.type(c, this.s.typeResolveNamedRef(t), modelMode)

            case "def":
                const modelDef = this.s.modelDef(t.nsId, t.typeId)
                const prefix = c.nsId && (c.nsId !== t.nsId || c.pkg !== "glued") ? `_ns_${t.nsId}.` : ``

                switch (modelMode) {
                    case "class":
                        return `${prefix}${title(modelDef.name)}`

                    case "interface":
                        return `${prefix}_${title(modelDef.name)}`

                    case "fieldTools":
                        return `() => ${prefix}${title(modelDef.name)}.fieldTool`

                    default:
                        return "unknown"

                }
        }
    }
}


class Emitter {
    private _indent: number = 0
    // private _lines: string[] = []
    constructor(public readonly w: Writer, private readonly path: string) { }

    indent() {
        this._indent++
    }

    dedent() {
        this._indent--
        this._indent = Math.max(0, this._indent)
    }

    line(s: string = ``) {
        this.w.write(this.path, "\n" + "\t".repeat(this._indent) + s)
        // this._lines.push("\t".repeat(this._indent) + s)
    }

    chars(s: string) {
        this.w.write(this.path, s)
        // if (this._lines.length == 0) {
        //     this._lines.push(s)
        // } else {
        //     this._lines[this._lines.length - 1] = this._lines[this._lines.length - 1] + s
        // }
    }

    close() {
        this.w.close(this.path)
    }

    // write() {
    //     this.w.write(this.path, this._lines.join("\n"))
    // }
}
