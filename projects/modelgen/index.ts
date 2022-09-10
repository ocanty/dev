import { Mode, write } from "fs"
import * as fs from "fs/promises"
import * as path from "path"

async function modelgen() {
    await new WDefs("1.0", {
        100: Namespace("api", {
                0: ModelDef("none", {}),
                1: ModelDef("ok", {
                    0: Field("message", Str())
                }),
                2: ModelDef("error", {
                    0: Field("message", Str()),
                    1: Field("code", Int32())
                }),
            }
        ),
        101: Namespace("svcd", {
            0: ModelDef("kvget", {
                0: Field("key", Str())
            }),
            1: ModelDef("kvset", {
                0: Field("key", Str()),
                1: Field("value", Str())
            }),
        }, {
            0: Service("kv", {
                server: "go",
                clients: ["go", "ts"],
                config: Model("api/none")
            }, {
                0: Method("get", Model("svcd/kvget"), Model("svcd/kvset")),
                1: Method("set", Model("svcd/kvset"), Model("api/ok"))
            })
        }),

        150: Namespace("lang", {
            0: ModelDef("proj", {
                0: Field("id", Str(), { primary: true }),
                1: Field("name", Str()),
                2: Field("models", Dict(Model("lang/modelDef")))
            }),
            1: ModelDef("modelDef", {
                0: Field("id", Str()),
                1: Field("fields", Dict(Model("api/ok")))
            })
        })
    }).build()
}

export interface TypeBoolConstraints {}

export interface TypeBool {
    id: "bool"
    constraints?: TypeBoolConstraints
}

export interface TypeStrConstraints {}
export interface TypeStr {
    id: "str"
    constraints?: TypeStrConstraints
}


export interface TypeAny {
    id: "any"
}

export interface TypeInt32Constraints {
    min?: number
    max?: number
}

export interface TypeInt32 {
    id: "int32"
    constraints?: TypeInt32Constraints
}

export interface TypeDictConstraints {}
export interface TypeDict {
    id: "dict"
    contains: Type
    constraints?: TypeDictConstraints
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

export interface TypeArrayConstraints {
    min?: number
    max?: number
}

export interface TypeArray {
    id: "array"
    contains: Type
    constraints?: TypeArrayConstraints
}

export type TypeFinal = TypeStr | TypeBool | TypeInt32 | TypeModel | TypeModelRef | TypeAny | TypeRaw | TypeAny
export type TypeContainer = TypeDict | TypeArray | TypeNullable
export type Type = TypeContainer | TypeFinal

export interface TypeModel {
    id: "model"
    nsId: string
    modelId: string
}

export interface TypeModelRef {
    id: "modelRef"
    ref: string
}

export interface Field {
    name: string
    type: Type
    constraints: FieldConstraints
}

export interface ModelDef {
    name: string
    fields: Record<number, Field>
}

export interface Models {
    name: string
    defs: Record<number, ModelDef>
}

export interface Namespace {
    name: string
    models: Record<number, ModelDef>
    services: Record<number, Service>
}

export function Namespace(name: string, models: Record<number, ModelDef>, services: Record<number, Service> = {}) {
    return {name, models, services}
}

export function ModelDef(name: string, fields: Record<number, Field>): ModelDef {
    return {name: name,fields}
}

export interface FieldConstraints {
    primary?: boolean
}

export function Field(name: string, type: Type, constraints: FieldConstraints = {}): Field {
    return {name: name, type, constraints}
}

export function Bool(constraints?: TypeBoolConstraints): TypeBool {
    return { id: "bool", constraints }
}

export function Raw(): TypeRaw {
    return { id: "raw" }
}

export function Any(): TypeAny {
    return { id: "any" }
}

export function Str(constraints?: TypeStrConstraints): TypeStr {
    return { id: "str", constraints }
}

export function Nullable(contains: Type): TypeNullable {
    return { id: "nullable", contains }
}

export function Int32(constraints?: TypeInt32Constraints): TypeInt32 {
    return { id: "int32", constraints }
}

export function Array(contains: Type, constraints?: TypeArrayConstraints): TypeArray {
    return { id: "array", contains, constraints }
}

export function Dict(contains: Type, constraints?: TypeDictConstraints): TypeDict {
    return { id: "dict", contains, constraints }
}

export function Model(id: string): TypeModelRef {
    return {
        id: "modelRef",
        ref: id
    }
}

export function Optional(contains: Type): TypeNullable {
    return { id: "nullable", contains }
}

export type TargetID = "go" | "ts" | "lua"

export interface ServiceHead {
    name?: string
    description?: string
    server: TargetID
    clients: Array<TargetID>
    config: Type
}

export interface Service extends ServiceHead {
    name: string
    methods: Record<number, Method>
}

export interface Method {
    name: string
    params: TypeModelRef
    returns: TypeModelRef
}

export function Service(name: string, h: ServiceHead, methods: Record<number, Method>): Service {
    return {name,methods, ...h}
}

export function Method(id: string, params: TypeModelRef, returns: TypeModelRef): Method {
    return {name: id,params,returns}
}

export interface Defs {
    namespaces: Record<number, Namespace>
}

interface Writer {
    write(path: string, s: string): void
}

class WriterFile implements Writer {

    constructor(private readonly basePath: string) {
        
    }

    private seen: Record<string, boolean> = {}
    
    private async exists(path: string): Promise<boolean> {
        try {
            await fs.access(path)
            return true
        } catch (e) {
            return false
        }
    }


    async write(relPath: string, s: string) {
        const baseRealPath = await fs.realpath(this.basePath)
        const basepathExists = await this.exists(baseRealPath)

        if (!basepathExists) {
            throw new Error("base path does not exist.")
        }

        const filePath = await path.join(baseRealPath, relPath)
        
        if (!(filePath in this.seen)) {
            await fs.open(filePath, "w+")
            this.seen[filePath] = true
        }
    
        await fs.appendFile(filePath, s)
    }
}

export class WDefs implements Defs {
    private models: Record<string, [string, string, ModelDef]> = {}
    private methods: Record<string, Method> = {}
    private dependsOn: Record<string, Record<string, Namespace>> = {}

    constructor(
        public readonly version: string,
        public readonly namespaces: Record<string, Namespace>
    ) {
        this.namespaces[rpcNsId] = rpcNs

        this.indexBuild()
    }

    public nsDeps(nsId: string): Record<string, Namespace> {
        if (nsId in this.dependsOn) {
            return this.dependsOn[nsId]
        }

        return {}
    }

    private indexBuild() {
        this.models = {}
        this.methods = {}
        
        for(const [nsId, ns] of Object.entries(this.namespaces)) {
            const keyName = (s: string) => {
                return ns.name + "/" + s
            }
            
            for (const [modelId, model] of Object.entries(ns.models)) {
                this.models[keyName(model.name)] = [nsId, modelId, model]
            }
        }

        // Build dependency graph
        const dependsOn: Record<string, Record<string, Namespace>> = {}
        
        const setDepends = (originNsId: string, targetNsId: string) => {
            dependsOn[originNsId] = dependsOn[originNsId] || {}
            dependsOn[originNsId][targetNsId] = this.namespace[targetNsId]
        }

        const setDependsType = (t: Type, originNsId: string) => {
            if (t.id != "modelRef") return

            if (this.models[t.ref] !== undefined) {
                const [depNsId, depModelId, depModel] = this.models[t.ref]
                setDepends(originNsId, depNsId)
            } else {
                throw new Error(`unknown model reference ${t.ref}`)
            }
        }

        for (const [nsId, ns] of Object.entries(this.namespaces)) {
            for (const [modelId, model] of Object.entries(ns.models)) {
                for (const [fieldId, f] of Object.entries(model.fields)) {
                    setDependsType(f.type, nsId)
                }
            }

            for (const [svcId, svc] of Object.entries(ns.services)) {
                for (const [methodId, method] of Object.entries(svc.methods)) {   
                    setDependsType(method.params, nsId)
                    setDependsType(method.returns, nsId)
                }
            }

            // Make every namespace depend on the RPC namespace
            if (nsId != rpcNsId) {
                setDepends(nsId, rpcNsId)
            }
        }

        this.dependsOn = dependsOn


        // Check for circular dependencies by topologically sorting
        // // Clone dependency edges
        // const dependsCheck = structuredClone(dependsOn)
        
        // const schedule: string[] = []

        // while (schedule.length != Object.keys(this.namespaces).length) {
            
        // }


        // const dependsA = structuredClone(this.depends)

        // const seen: Record<string, boolean> = {}
        // const used: Record<string, boolean> = {}

        // const queue: string[] = []


        // // While there are namespaces remaining
        // while (Object.keys(dependencies).length > 0) {
        //     for (const [namespaceNo, namespace] of Object.entries(this.namespaces)) {
        //         if (namespaceNo in dependencies) {
                    
        //         } else {
                    
        //         }
        //     }
        // }
    }

    resolveModelRef(t: TypeModelRef): Type {
        if (this.models[t.ref] == undefined) {
            throw new Error(`could not resolve model reference ${t.ref}`)
        }

        const [namespaceNo, modelNo, model] = this.models[t.ref]

        return {
            id: "model",
            nsId: namespaceNo,
            modelId: modelNo
        }
        
    }

    // resolveInterface(s: string): [string, string, Interface] {
    //     const t = this.interfaces[s]
    //     if (!t) {
    //         throw new Error(`no such interface ${s}`)
    //     }
    //     return t
    // }

    namespaceName(namespaceNo: string): string {
        const s = this.namespaces[namespaceNo].name
        if (!s) {
            throw new Error(`no namespace ${namespaceNo}`)
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

    modelDef(namespaceNo: string, modelNo: string): ModelDef {
        const n = this.namespace(namespaceNo)
        const model = n.models?.[modelNo]
        if (!model) {
            throw new Error(`no such modeldef (${namespaceNo},${modelNo})`)
        }
        return model
    }
    

    async build() {
        console.log("Starting build!")

        new TargetTS(
            this, new WriterFile("./tree/defs/ts")
        ).emit()
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

const rpcNsId = "0"
const rpcNs = Namespace("rpc",  {
    0: ModelDef("request", {
        0: Field("version", Int32()),
        1: Field("method", Int32()),
        2: Field("id", Str()),
        3: Field("params", Dict(Any()))
    }),
    1: ModelDef("response", {
        0: Field("version", Int32()),
        1: Field("id", Str()),
        2: Field("return", Nullable(Dict(Any()))),
        3: Field("error", Nullable(Model("rpc/error")))
    }),
    2: ModelDef("error", {
        0: Field("code", Int32()),
        1: Field("message", Str())
    })
})


interface TSEmitCtx {
    em: Emitter
    nsId?: string
}

class TargetTS implements Target {
    targetId: TargetID = "ts"

    constructor(private readonly s: WDefs, private readonly w: Writer) {}

    emit() {
        for (const [nsId, ns] of Object.entries(this.s.namespaces)) {
            let ctx: TSEmitCtx = {
                em: new Emitter(this.w, `${nsId}.ts`),
                nsId
            }

            ctx.em.line(`import * as _M from "@tree/model"`)
            for (const [mId, m] of Object.entries(ns.models)) {
                this.model(ctx, mId, m)
            }  

            for(const [svcId, svc] of Object.entries(ns.services)) {    
                const needsClient = svc.clients.indexOf(this.targetId)
                const needsServer = svc.server == this.targetId

                this.svcInterface(ctx, ns.name, svc)

                // if (needsServer) {
                //     const em = new Emitter(this.w, `namespaces/${ns.id}${title(svc.id)}.server.ts`)
                //     c.em.line(`import * as _C from "./${ns.id}.common.ts`)
                //     this.emitServiceClient
                // }

                if (needsClient) {
                    let clientCtx: TSEmitCtx = {
                        em: new Emitter(this.w, `${nsId}.${svcId}.client.ts`),
                        nsId
                    }
                    this.svcClient(clientCtx, nsId, svcId, svc)
                    clientCtx.em.write()
                }

            }
            
            ctx.em.write()
        }
    }

    private svcName(int: Service) {
        return title(int.name)
    }

    private svcInterface(c: TSEmitCtx, nsId: string, svc: Service) {
        for (const [depNsId, ns] of Object.entries(this.s.nsDeps(nsId))) {
           c.em.line(`import * as _${depNsId} from "@tree/defs/ts/${depNsId}"`)
        }

        c.em.line(`export interface ${this.svcName(svc)} {`)
        c.em.indent()

        for (const [_, m] of Object.entries(svc.methods)) {
            c.em.line(
                `${m.name}(p: ${this.type(c, m.params, "class")}): Promise<${this.type(c, m.returns, "class")}>`
            )
        }
        
        c.em.dedent()
        c.em.line(`}`)
    }

    // private svcServer(s: Defs, em: Emitter, svcNo: string, svc: Service)  {
    //     c.em.line(`export class ${title(svc.id)}Server extends RpcServer {`)
    //     c.em.indent()

    //     c.em.line(`constructor(host: string, port: number, )`)
    // }

    private svcClient(c: TSEmitCtx, nsId: string, svcId: string, svc: Service)  {
        for (const [depNsId, ns] of Object.entries(this.s.nsDeps(nsId))) {
           c.em.line(`import * as _${depNsId} from "@tree/defs/ts/${depNsId}"`)
        }

        c.em.line(`export class Client extends _${rpcNsId}.Client implements _${svcId}.${this.svcName(svc)} {`)
        c.em.indent()
        c.em.line(`constructor(remote: string) {`)
        c.em.indent()
        c.em.line(`super(remote)`)
        c.em.dedent()
        c.em.line(`}`)
        
        for (const [mId, m] of Object.entries(svc.methods)) {
            c.em.line(`async ${m.name}(p: ${this.type(c, m.params, "interface")}): Promise<${this.type(c, m.returns, "interface")}> {`)
            c.em.indent()

            c.em.line(`return new ${this.type(c, m.returns, "class")}()._unmarshal(`)
            c.em.indent()
            c.em.line(`(await this.request(new _${rpcNsId}.Request({`)
            c.em.indent()
            c.em.line(`method: ${mId},`)
            c.em.line(`id: this.newRequestId(),`)
            c.em.line(`params: new ${this.type(c, m.params, "class")}(p)._marshal(),`)
            c.em.dedent()
            c.em.line(`}))).return)`)
            c.em.dedent()
            c.em.dedent()
            c.em.line(`}`)
        }
        
        c.em.dedent()
        c.em.line(`}`)
    }
    
    // private validateAssign(c: TSEmitCtx, t: Type, prop: string, parent?: string): string {
    //     const check = (validExpr: string, assign: string, init: string, valid: string) => {
    //         return `(${validExpr}) ? (${valid} &= true, ${assign}) : (${valid} &= false, ${init})`
    //     }

    //     switch (t.id) {
    //         case "bool": {
    //             return check(`_M.Validate.bool(${prop})`, prop, this.defaultValue(c, t), `"expected a boolean"`)
    //         }

    //         case "int32": {
    //             return check(`_M.Validate.int32(${prop})`,
    //                 prop, this.defaultValue(c, t),
    //                 `"expected a number"`
    //             )
    //         }

    //         case "raw":
    //             return check(
    //                 `_M.Validate.raw(${prop})`, prop, this.defaultValue(c, t), `"expected a raw"`
    //             )

    //         case "str": {
    //             return check(
    //                 `_M.Validate.str(${prop})`,
    //                 prop, this.defaultValue(c, t),
    //                 `"expected a string"`
    //             )
    //         }

    //         case "nullable": {
    //             return check(
    //                 `_M.Validate.nullable(${prop})`,
    //                 prop, this.defaultValue(c, t),
    //                 `""`
    //             )
    //         }

    //         case "array":
    //             return check(
    //                 `Array.isArray(${prop}) && ${prop}.every((v, i, a) =>   a[i] = ${this.validateAssign(c, t.contains, prop, errStack, `${parent}[i]`)})`,
    //                 prop, this.defaultValue(c, t),
    //                 `"expected an array"`
    //             )


    //         case "modelRef": {
    //             return this.validateAssign(c, this.s.resolveModelRef(t), prop, errStack, parent)
    //         }

    //         default:
    //             throw new Error("unknown type " + t.id)
    //     }
    // }
     
    private defaultValue(c: TSEmitCtx, t: Type): string {
        switch (t.id) {
            case "raw":
                return `"{}"`

            case "bool":
                return "false"

            case "str":
                return `""`

            case "nullable":
                return "undefined"

            case "int32":
                return "0"

            case "array":
                return "[]"

            case "dict":
                return "{}"

            case "modelRef":
                return this.defaultValue(c, this.s.resolveModelRef(t))

            case "model":
                return `new ${this.type(c, t, "class")}()`

            case "any":
                return "unknown"
        } 
    }



    // const initValue = (prop: string, t: Type): string => {
    //         switch (t.id) {
    //             case "raw":
    //                 return `"{}"`

    //             case "model":
    //                 return `new ${this.tsType(t, "class")}().__unmarshalFields(${prop})`
                
    //             case "modelRef":
    //                 return initValue(prop, this.s.resolveModelRef(t))

    //             case "array":
    //                 return `${prop}.map((v) => ${initValue("v", t.contains)})`

    //             case "dict":
    //                 return `Object.fromEntries(Object.entries(${prop}).map(([k,v], i) => [k, ((vold) => (${initValue("vold", t.contains)}))(v)]))`

    //             case "nullable":
    //                 return `${prop} !== undefined ? ${initValue(prop, t.contains)} : undefined`
                
    //             default:
    //                 return `${prop} !== undefined && typeof ${prop} == ${this.jsType()} ? ${prop} : ${this.defaultValue(t)}`
    //         }
    //     }

    //     const validate = (v: string, t: Type): string => {
    //         switch (t.id) {
    //             case "model":
    //                 return `${v}._validate()`

    //             case "modelRef":
    //                 return validate(v, this.s.resolveModelRef(t))

    //             case "nullable":
    //                 return `${v} !== undefined ? (${validate(v, t.contains)}) : true`

    //             case "array":
    //                 return `${v}.map((v) => (${validate("v", t.contains)})).every(t => t)`

    //             case "dict":
    //                 return `Object.entries(${v}).map(([k,v]) => (${validate("v", t.contains)})).every(t => t)`

    //             case "int32":
    //                 return `typeof ${v} == "number" && ${v}%1 == 0`

    //             case "str":
    //                 return `typeof ${v} == "string"`

    //             case "bool":
    //                 return `typeof ${v} == "boolean"`
    //         }
    //     }

    // private initValue(c: TSEmitCtx, prop: string, t: Type, valid: string) {
    //     // switch (t.id) {
    //     //     case "str":
    //     //         return `_M.Validate.str(${prop}) ? ${}`
    //     // }
    //     switch (t.id) {
    //         case "str":
    //             return ``

    //     }
    // }

    private model(c: TSEmitCtx, mId: string, m: ModelDef) {
        if (!c.nsId) {
            throw new Error("namespace context required")
        }

        const mType: TypeModel = {
            id: "model",
            nsId: c.nsId,
            modelId: mId
        }
        
        // Model(`${c.nsId}/${m.name}`)

        // Build prop interface
        c.em.line(`interface ${this.type(c, mType, "interface")} {`)
        c.em.indent()

        for (const [fId, f] of Object.entries(m.fields)) {
            c.em.line(`${f.name}: ${this.type(c, f.type, "interface")}`)
        }

        c.em.dedent()
        c.em.line(`}`)

        c.em.line()
        c.em.line(`export class ${this.type(c, mType, "class")} `)
        c.em.chars(`implements ${this.type(c, mType, "interface")}, _M.Model {`)
        c.em.indent()

        Object.entries(m.fields).forEach(([fieldId, field]) => {
            c.em.line(`${field.name}: ${this.type(c, field.type, "class")}`)
        })
        
        const constructValue = (prop: string, t: Type): string => {
            switch (t.id) {
                case "raw":
                    return `"{}"`

                case "modelRef":
                    return constructValue(prop, this.s.resolveModelRef(t))

                case "model":
                    return `new ${this.type(c, t, "class")}(${prop})`
                
                case "array":
                    return `${prop}.map((v) => ${constructValue("v", t.contains)})`

                case "dict":
                    return `Object.fromEntries(Object.entries(${prop}).map(([k,v], i) => [k, ((vold) => (${constructValue("vold", t.contains)}))(v)]))`

                case "nullable":
                    return `${prop} !== undefined ? ${constructValue(prop, t.contains)} : undefined`
                
                default:
                    return `${prop} !== undefined ? ${prop} : ${this.defaultValue(c, t)}`
            }
        }

        c.em.line(`constructor(o?: _M.DeepPartial<${this.type(c, mType, "interface")}>) {`)
        c.em.indent()
        Object.entries(m.fields).forEach(([fieldNo, field]) => {
            c.em.line(`this.${field.name} = ${constructValue("o."+field.name, field.type)}`)
        })
        c.em.dedent()
        c.em.line(`}`)

        c.em.line()
        
        const validateValue = (prop: string, t: Type): string => {
            switch (t.id) {
                case "raw":
                    return `"_M.Validate.raw(${prop})"`

                case "modelRef":
                    return validateValue(prop, this.s.resolveModelRef(t))

                case "model":
                    return `new ${this.type(c, t, "class")}(${prop})`
                
                case "array":
                    return `${prop}.map((v) => ${constructValue("v", t.contains)})`

                case "dict":
                    return `Object.fromEntries(Object.entries(${prop}).map(([k,v], i) => [k, ((vold) => (${constructValue("vold", t.contains)}))(v)]))`

                case "nullable":
                    return `${prop} !== undefined ? ${constructValue(prop, t.contains)} : undefined`
                
                default:
                    return `${prop} !== undefined ? ${prop} : ${this.defaultValue(c, t)}`
            }
        }

        c.em.line(`_validate(): boolean {`)
        c.em.indent()
        c.em.line(`let valid = true`)

        Object.entries(m.fields).forEach(([fieldNo, field]) => {
            c.em.line(`valid &&= ${validate(`this.${field.name}`, field.type)}`)
        })
        c.em.line(`return valid`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`_copy(): ${this.type(c, mType, "class")} {`)
        c.em.indent()
        c.em.line(`return new ${this.type(c, mType, "class")}({`)
        c.em.indent()
        const copy = (v: string, t: Type): string => {
            switch (t.id) {
                case "model":
                    return `${v}._copy()`

                case "modelRef":
                    return copy(v, this.s.resolveModelRef(t))

                case "nullable":
                    return `${v} !== undefined ? (${copy(v, t.contains)}) : undefined`

                case "array":
                    return `${v}.map((v) => (${copy("v", t.contains)}))`

                case "dict":
                    return `Object.fromEntries(Object.entries(${v}).map(([k,v], i) => [k, ((vold) => (${copy("vold", t.contains)}))(v)]))`

                case "int32":
                    return v

                case "str":
                    return v

                case "bool":
                    return v

                default:
                    throw new Error("unhandled: " + t.id)
            }
        }
        Object.entries(m.fields).forEach(([fieldNo, field]) => {
            c.em.line(`${field.name}: ${copy("this."+field.name, field.type)},`)
        })
        c.em.dedent()
        c.em.line(`})`)
        c.em.dedent()
        c.em.line(`}`)

        const repr = (em: Emitter, prop: string, t: Type): string => {
            switch (t.id) {
                case "array":
                    c.em.chars("[")
                    
                    c.em.chars("]")

                case "any":
                    return "<any>"
                case "bool":
                    return "${" + prop + " ? 'true' : 'false' }"

                case "dict":

                case "int32":
                    return "${" + prop + "}"
                    

                case "model":
                    return `${prop}._repr(n+1)`

                case "nullable":
                    return `${prop} !== undefined ? (${marshal(prop, t.contains)}) : undefined`
                
                case "raw":

                case "str":
                    return ``

                default:
                    return `${prop}`
            }
        }

        c.em.line(`_repr(n: number = 0): string {`)
        c.em.indent()

        c.em.chars("return `{")
        
        for (const [fId, f] of Object.entries(m.fields)) {
            c.em.chars("\\\\n")
            c.em.chars("${'\t'.repeat(n)}\t")
            c.em.chars(f.name)
            c.em.chars(": ")
            repr(c.em, `this.${f.name}`, f.type)
            c.em.chars(",")
        }

        c.em.chars("}`")
        

        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`__marshalFields(): object {`)
        c.em.indent()
        c.em.line(`return {`)
        c.em.indent()

        const marshal = (prop: string, t: Type): string => {
            switch (t.id) {
                case "model":
                    return `${prop}.__marshalFields()`

                case "modelRef":
                    return marshal(prop, this.s.resolveModelRef(t))

                case "nullable":
                    return `${prop} !== undefined ? (${marshal(prop, t.contains)}) : undefined`
                
                default:
                    return `${prop}`
            }
        }

        Object.entries(m.fields).forEach(([fieldNo, field]) => {
            c.em.line(`${fieldNo}: ${marshal(`this.${field.name}`,field.type)},`)
        })
        c.em.dedent()
        c.em.line(`}`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`__unmarshalFields(p: object): ${this.type(c, mType, "class")} {`)
        c.em.indent()
        c.em.line(`if (typeof p !== "object") {`)
        c.em.indent()
    	c.em.line(`return this`)
        c.em.dedent()
		c.em.line(`}`)
        
        Object.entries(m.fields).forEach(([fieldNo, field]) => {
            c.em.line(`this.${field.name} = ${this.initValue(c, "p["+fieldNo+"]", field.type)}`)
        })
        c.em.line(`return this`)
        c.em.dedent()
        c.em.line(`}`)


        c.em.line(`_marshal(): string {`)
        c.em.indent()
        c.em.line(`return JSON.stringify(this.__marshalFields())`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`_unmarshal(data: string) {`)
        c.em.indent()
        c.em.line(`return this.__unmarshalFields(JSON.parse(data))`)
        c.em.dedent()
        c.em.line(`}`)
        
        c.em.dedent()
        c.em.line(`}`)
    }

    // private typeEqual(t1: Type, t2: Type): boolean {
    //     if (t1.id !== t2.id) {
    //         return false
    //     }

    //     switch (t1.id) {
    //         case "model":
    //             return this.typeModelEqual(t1, t2 as TypeModel)

    //         default:
    //             return true
    //     }
    // }

    // private typeModelEqual(t1: TypeModel, t2: TypeModel): boolean {
    //     return t1.modelId == t1.modelId && t2.packageId == t2.packageId
    // }

    
    private namespace(n: Namespace): string {
        return `_${title(n.name)}`
    }

    private type(
        c: TSEmitCtx,
        t: Type,
        modelMode: "class" | "interface" | "fields" = "class",
    ): string {
        console.log(modelMode, "<-- modelMode")

        switch (t.id) {
            case "raw":
                return `string`

            case "bool":
                return "boolean"

            case "str":
                return "string"

            case "nullable":
                return "_M.Nullable<" + this.type(c, t.contains, modelMode) + ">"

            case "int32":
                return "number"

            case "array":
                return "Array<" + this.type(c, t.contains, modelMode) + ">"

            case "dict":
                return "Record<string," + this.type(c, t.contains, modelMode) + ">"

            case "modelRef":
                return this.type(c, this.s.resolveModelRef(t),modelMode)

            case "model":
                const modelDef = this.s.modelDef(t.nsId, t.modelId)                
                const prefix = c.nsId && c.nsId !== t.nsId ? `_${t.nsId}.` : ``

                switch (modelMode) {
                    case "class":
                        return`${prefix}${title(modelDef.name)}`
                    
                    case "interface":
                        return `${prefix}_${title(modelDef.name)}`

                    default:
                        "unknown"
                        
                }          
        } 
    }
}


class Emitter {
    private _indent: number = 0
    private _lines: string[] = []
    constructor(public readonly w: Writer, private readonly path: string) {}

    indent() {
        this._indent++
    }

    dedent() {
        this._indent--
        this._indent = Math.max(0, this._indent)
    }

    line(s: string = ``) {
        this._lines.push("\t".repeat(this._indent)+s)
    }

    chars(s: string) {
        if (this._lines.length == 0) {
            this._lines.push(s)
        } else {
            this._lines[this._lines.length] += s
        }
    }

    write() {
        this.w.write(this.path,this._lines.join("\n"))
    }
}

(async () => {
    try {
        modelgen()
    } catch (e) {
        console.error(e)
    }
})()