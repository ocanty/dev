import * as fs from "fs"
import path from "path"
import * as lock from "proper-lockfile"
import { Emitter } from "./emitter.js"
import { RelRW } from "./relrw.js"
import { hashFile } from "./util.js"

/**
 * dev code generator: README
 * 
 * Every aspect of dev needs to be in a layer.
 * A layer can only rely on the logic/definitions in itself or the layers below it.
 * Layering violations are checked an enforced
 * 
 * Within a layer, there are namespaces. (Namespace names and IDs are still global however)
 * A namespace is a logical grouping of definitions, database queries, queues, services
 * 
 * Each layer has a default namespace. E.g. the svc layer has the svc namespace.
 * 
 * An NPM package exists for each namespace, an additional package exists for each service within that namespace.
 * 
 * Each package is prefixed with the layer, e.g. for the service named "service" in the "db" namespace which is a member
 * of the "svc" layer -> svc-db-service
 */


// TODO(canty)
// rework fields context

// Layer number, layers do not exist after compilation
// Only a package in a lowest layer can import 
// a package from a layer above
export enum Layer {
    _FIRST_LAYER,

    // Core layer -> utilities
    Core,

    // Infra layer -> rpc and infrastructure
    Infra,

    // Svc layer -> services
    Svc,

    // Biz layer -> business logic
    Biz,

    // App layer -> application logic
    App,

    // Deploy layer -> meta layer with access to every layer above
    // Required layer, do not remove
    Deploy,
    _LAST_LAYER
}

// Namespace number, needs to be a 16 bit value
enum NS {
    _FIRST_NS,

    _Layer_NS_Begin_Core = 63,
    core = 64,

    _Layer_NS_Begin_Infra = 19999,
    infra = 20000,
    rpcserver = 20001,
    rpcclient = 20002,
    dbwrapper = 20003,

     _Layer_NS_Begin_Svc = 29999,
    svc = 30000,
    svcclient = 30001,
    kv = 30002,
    idm = 30003,
    host = 30004,
    db = 30005,
    queue = 30006,
    sbox = 30007, // Testing ground
    
    shephard = 30008,

    _Layer_NS_Begin_Biz = 39999,
    biz = 40000,
    account = 40001,
    billing = 40002,
    lang = 40003,

    _Layer_NS_Begin_App = 49999,
    app = 50000,

    _Layer_NS_Begin_Deploy = 59999,
    deploy = 60000,

    _LAST_NS,
    _MAX_NS = 65535 // Layer number can't be more than 65k bits
}


// Maps a Layer enum to it's general namespace 
const LayerNS: Record<number, NS> = {
    [Layer.Core as number]: NS.core,
    [Layer.Infra]: NS.infra,
    [Layer.Svc]: NS.svc,
    [Layer.Biz]: NS.biz,
    [Layer.App]: NS.app,
    [Layer.Deploy]: NS.deploy,
    [Layer._LAST_LAYER]: NS._LAST_NS
}

export function Spec() {
    return new SpecBuilder()
        .namespace(Layer.Core, NS.core)
            .types()
                .enum(0, "logLevel")
                    .value(0, "info")
                    .value(1, "warn")
                    .value(2, "error")
                    .value(3, "critical")
                .def(1, "log")
                    .field(0, "level", T("core/logLevel"))
                    .field(2, "context", Dict(Any()))
                    .field(3, "fields", Dict(Any()))
                .def(2, "empty")

        .namespace(Layer.Infra, NS.infra)
            .types()
                .def(0, "rpcRequest")
                    .field(0, "version", Int32())
                    .field(1, "reqId", Str())
                    .field(2, "nsId", Int32())
                    .field(3, "svcId", Int32())
                    .field(4, "methodId", Int32())
                    .field(5, "params", Dict(Any()))

                .def(1, "rpcResponse")
                    .field(0, "version", Int32())
                    .field(1, "reqId", Str())
                    .field(2, "result", T(`rpcResult`))
                    
                .def(2, "rpcError")
                    .field(0, "message", Str())
                    
                .enum(3, "rpcResult")
                    .value(0, "ok",                 Dict(Any()))
                    .value(1, "unhandledException", T("infra/rpcError"))
                    .value(2, "noSuchService")
                    .value(3, "noSuchMethod")

        .namespace(Layer.Infra, NS.rpcserver)
        .namespace(Layer.Infra, NS.rpcclient)
        .namespace(Layer.Infra, NS.dbwrapper)
            .types()
                .def(0, "dbConfig")
                    .field(0, "postgresConnectionStr", Str())
            
        .namespace(Layer.Svc, NS.svc)
            .types()
                .def(0, "svcAddr")
                    .version(1, [0,1,2,3])
                    .field(0, "cluster", Str())
                    .field(1, "namespace", Str())
                    .field(2, "svc", Str())
                    .field(3, "host", Nullable(Str()))
                    .field(4, "proc", Nullable(Str())) 

        .namespace(Layer.Svc, NS.host)
            .files()
            .types()
                .def(0, "config")
                    .field(0, "keystones", Dict(T("svc/svcAddr")))
                .enum(1, "log")
                    .value(0, "CADDY_STDOUT", Str())
            .services()
                .service(0, "service", {
                    config: T("host/config")
                })
                    .requires(Svc("config/json"))
                    .method(0, "ping", T("host/config"), T("host/config"))
        
        .namespace(Layer.Svc, NS.idm) 
            // .queries()
            //     .query(0, "lookupAuthSecret", Types("credential"), Array(Types("credential")))
                 
            .types()
                .def(0, "config")
                    .field(0, "credentials",   Dict(T("credential")))
                
                // idm$role$shard$[id]
                // idm^role^4096^32d86034-6d14-4d8b-b158-5723277517e3
                .def(1, "role")
                    .field(0, "id",            IdOf(T("role")))
                    .field(1, "rolename",      Str())
                
                // <local/db>/shard/namespaceId/modelId/<64bytes>
                // local/namespaceId/modelId/00ccebbc-13e0-7000-8b18-6150ad2d0c05

                .def(2, "identity")
                    .field(0, "id",            IdOf(T("identity")))
                    .field(1, "groups",        Array(IdOf(T("group"))))

                .def(3, "authSecret")
                    .field(0, "id",            IdOf(T("authSecret")))
                    .field(1, "identityId",    IdOf(T("identity")))
                    .field(1, "key",           Array(Str()))

                .def(4, "group")
                    .field(0, "id",            IdOf(T("group")))
                    .field(1, "name",          Str())
                    .field(2, "roles",         Array(IdOf(T("role"))))

                .def(7, "credential")
                    .field(0, "id",              IdOf(T("credential")))
                    .field(1, "svcAddrsAllowed", Array(Str())) // <clusterId>-<nsId>-<svcId>: <specific machine>
                    .field(2, "roles",           Array(IdOf(T("role"))))

                .def(100, "credentialGetReq")
                    .field(0, "rpcHandshake", Str())
                    .field(1, "signature",    Str())

                .enum(101, "credentialGetRes")
                    .value(0, "credentialUnavailable")
                    .value(1, "credential", T("credential"))

                .enum(102, "error")
                    .value(1, "invalidCredential")

            .services()
                .service(0, "service", {
                    config: T("config")
                })
                    .method(0, "credentialGet", T("credentialGetReq"), T("credentialGetRes"))

                      
        .namespace(Layer.Svc, NS.db)
            .types()
                .def(0, "config")
                    .field(0, "postgresConnectionStr", Str())
            .services()
                .service(0, "service", { config: T("db/config")})
        
        .namespace(Layer.Svc, NS.shephard)
            .services()
                .service(0, "service", { config:    T("serviceConfig")})
                    .method(10, "hostEnroll",       T("hostEnrollRequest"),     T("hostEnrollResponse"))
                    .method(20, "serviceDeploy",    T("serviceDeployRequest"),  T("serviceDeployResponse"))
            .types()
                // RPCs
                .def(1000, "hostEnrollRequest")
                    .field(0, "sshHostname",        Str())
                    .field(1, "sshPort",            Int32())
                    .field(2, "sshKey",             Str())
                    .field(3, "hostServiceBinary",  Str())

                .def(1001, "hostEnrollResponse")
                    .field(0, "hostId",             IdOf(T("clusterHost")))
 
                .def(1002, "serviceDeployRequest")
                    .field(0, "nsId",               Str())
                    .field(1, "svcId",              Str())
                    .field(2, "binaryUrl",          Str())

                .def(1003, "serviceDeployResponse")
                    .field(0, "serviceDeploymentId",    IdOf(T("serviceDeployment")))

                .def(0, "serviceConfig")
                    .field(0, "clusterId",          IdOf(T("serviceConfig")))

                .def(98, "cluster")
                    .db().primary(0).shard(0).index([1])
                    .field(0, "id",                 IdOf(T("cluster")))
                    .field(1, "name",               Str())
                    .field(2, "secrets",            Nullable(T("clusterSecrets")))

                .def(99, "clusterSecrets")
                    .field(0, "nebulaCaKey",        Str())
                    .field(1, "nebulaCaCrt",        Str())

                .def(100, "clusterHost")
                    .field(0, "id",                 IdOf(T("clusterHost")))
                    .field(1, "clusterId",          IdOf(T("cluster")))
                    .field(2, "name",               Str())
                    .field(3, "secrets",            Nullable(T("hostSecrets")))
                    .field(4, "enrollmentStage",    T("enrollmentStage"))
                    .field(5, "endpoints",          T("hostEndpoints"))
                    
                .def(101, "hostSecrets")
                    .field(0, "ssh",                Str())
                    .field(1, "nebulaHostCrt",      Str())
                    .field(2, "nebulaHostKey",      Str())
                    .field(3, "hostServiceKey",     Str())

                .enum(102, "enrollmentStage")
                    .value(1, "waiting")
                    .value(2, "finished")

                    .value(20, "sshKeyInstall",)
                    .value(30, "nebulaMeshJoin")
                    .value(40, "hostServiceSetup")

                .def(103, "hostEndpoints")
                    .field(0, "sshHostname",        Str())
                    .field(1, "sshPort",            Int32())
                    .field(2, "nebulaIpAddress",    Str())

                .def(105, "service")
                    .field(0, "nsId",               Str())
                    .field(1, "svcId",              Str())
                    .field(2, "deploymentStategy",  T("deploymentStrategy"))

                .enum(106, "deploymentStrategy")
                    .value(1, "daemon")
                    .value(2, "replicated",         T("deploymentStategyReplicated"))
                
                .def(107, "deploymentStategyReplicated")
                    .field(0, "replicas",           Int32())

                .def(110, "serviceDeployment")
                    .db()
                        .primary(0).shard(1)
                    .field(0, "id",                 IdOf(T("serviceDeployment")))
                    .field(1, "clusterId",          IdOf(T("cluster")))
                    .field(2, "service",            T("service"))
                    .field(3, "deploymentStage",    T("deploymentStage"))
                    

                .enum(111, "deploymentStage")
                    .value(1, "waiting")
                    .value(2, "finished")
                    .value(3, "inProgress")


        .namespace(Layer.Biz, NS.biz)
        .namespace(Layer.App, NS.app)

        .namespace(Layer.Deploy, NS.deploy)
            .serviceGroups()
                .serviceGroup(0, "shephard", [
                    "shephard/service"
                ])
        
        // Meta layer
        // .namespace(Layer.Deploy, NS.deploy)
        //     .entrypoint()
        //     .types()
                // .model(0, "host")
                //     .field(0, "sshHostname", Str())
                //     .field(1, ""
                // .model(0, "clusterManifest")
                //     .field(0, "name", Str())
                //     .field(1, "fleet", Array(Str()))
                //     .field(1, "deployments", Dict(Types("deploy/deployment")))
                // .model(1, "deployment")
                //     .field(0, "id", Str())
                //     .field(1, "strategy", Types("deploy/strategy"))
                //     // .field(2, "type", )i
                // .enum(9, "deploymentType")
                //     .value(0, "nodejs")
                //     .value(1, "docker")
                // .enum(10, "strategy")
                //     .value(0, "daemon")
                //     .value(1, "replicas", Int32())
   
                    
        // .namespace(Layer.Deploy, NS.config)
        // .namespace(Layer.Deploy, NS.secrets) 

        // .namespace(Layer.Svc, NS.queue)
        //     .types()
        //         .model(0, "config")
        //             .field(0, "postgresConnectionStr", Str())

        //     .services()
        //         .service(0, "srv", { config: Types("queue/config")})

        // .namespace(Layer.Biz, NS.account)
        //     .types()
        //         .model(0, "config")
        //         .model(1, "account")

        // .namespace(Layer.Biz, NS.billing)
        
}

// TODO(ocanty) writer interface

function entries<T>(o: Record<number, T>): [number,T][] {
    return Object.entries(o) as unknown as any
}

class SpecBuilder {
    ctx: {
        ns?: Namespace
        queues?: {}
        types?: {}
        struct?: TypeStruct
        fields?: Record<number, Field>
        
        enum?: TypeEnum
        values?: Record<number, EnumValue>

        mutations?: Record<number, Mutation>
        mutation?: Mutation

        services?: {}
        service?: Service
     
        queries?: Record<number,Query>

        serviceGroups?: Record<number, ServiceGroup>
        serviceGroup?: ServiceGroup

    } = {} 

    spec: Record<string, Namespace> = {}

    namespace(layer: Layer, ns: NS) {
        if (ns.toString() === "index") {
            throw new Error("A namespace cannot be called index.")
        }

        // Hard limits
        if (ns > 65535) {
            throw new Error("namespace number must fit in 16bits")
        }

        const id = ns

        this.spec[id] = {
            nsId: ns,
            name: NS[ns],
            types: {},
            services: {},
            layer,
            explicitDependsOnNs: [],
            db: false,
            queries: {},
            serviceGroups: {},
            queues: {},
            entrypoint: "entrypoint.ts"
        } 

        this.ctx = {
           ns: this.spec[id]
        }
        return this
    }

    // entrypoint(e?: string) {
    //     if (this.ctx?.ns == undefined) throw this.bad()
    //     this.spec[this.ctx.ns.nsId].entrypoint = e || "entrypoint.js"
    //     return this
    // }

    files(path?: string) {
        if (this.ctx?.ns == undefined) throw this.bad()
        this.spec[this.ctx.ns.nsId].files = "embed"
        return this
    }

    types() {
        if (this.ctx?.ns == undefined) throw this.bad()
        this.ctx.types = {}
        this.ctx.ns.types = {}

        return this
    }

    queues() {
        if (this.ctx?.ns == undefined) throw this.bad()
        this.ctx.queues = {}

        return this
    }

    queue(id: number, name: string, type: Type) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.queues) throw this.bad()

        this.spec[this.ctx.ns.nsId].queues[id] = {
            name, type
        }
        // this.ctx.ns.queries = { query: {id} }

        if (id > 65535) {
            throw new Error("can't have ids greater than 65535")
        }

        return this
    }

    // needsNs(namespace: NS) {
    //     if (!this.ctx.ns) throw this.bad()

    //     this.spec[this.ctx.ns.nsId].explicitDependsOnNs =  this.spec[this.ctx.ns.nsId].explicitDependsOnNs.filter((v: NS) => v !== namespace)
    //     this.spec[this.ctx.ns.nsId].explicitDependsOnNs.push(namespace)
    //     return this
    // }

    // needsPkg(pkg: string, version: string) {

    // }

    def(typeId: number, name: string) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.types) throw this.bad()

        const stru: TypeStruct = {
            kind: "struct",
            nsId: this.ctx.ns.nsId,
            typeId,
            name,
            fields: {},
            mutations: {},
            queries: {}, constructors: {}
        }
        this.spec[this.ctx.ns.nsId].types[typeId] = stru
        
        this.ctx.struct = stru
        this.ctx.fields = stru.fields

        if (typeId > 65355) {
            throw new Error("can't have ids greater than 65355")
        }

        return this
    }

    mutations() {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.types) throw this.bad()
        if (!this.ctx.struct) throw this.bad()


        this.ctx.mutations = {}


        this.ctx.struct.mutations = []

        return this
    }

    mutation(id: number, name: string, params: TypeNamedType) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.types) throw this.bad()
        if (!this.ctx.struct) throw this.bad()
        if (!this.ctx.mutations) throw this.bad()
        
        this.ctx.mutations[id] = {
            name, params
        }

        return this
    }

    // db() {
    //     if (!this.ctx.ns) throw this.bad()
    //     if (!this.ctx.types) throw this.bad()
    //     if (!this.ctx.model) throw this.bad()

    //     this.spec[this.ctx.ns.nsId].types[this.ctx.model.id].meta.db = {}

    //     return this
    // }

    db() {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.struct) throw this.bad()
        this.ctx.ns.db = true

        this.ctx.queries = this.ctx.struct.queries

        this.ctx.struct.db = {
            indexes: []
        }


        // if (this.ctx.types && this.ctx.struct) {
        //     this.ctx.queries = this.spec[this.ctx.ns.nsId].types[this.ctx.struct.typeId].queries

        //     this.ctx.struct.db = {
        //         indexes: []
        //     }

        // } else {
        //     this.ctx.queries = this.spec[this.ctx.ns.nsId].queries
        // }


        return this
    }

    primary(fieldNo: number) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.struct) throw this.bad()
        if (!this.ctx.struct.db) throw this.bad()

        this.ctx.struct.db.primary = fieldNo

        return this
    }

    shard(fieldNo: number) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.struct) throw this.bad()
        if (!this.ctx.struct.db) throw this.bad()

        this.ctx.struct.db.shard = fieldNo

        return this
    }

    index(fieldNo: number[]) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.struct) throw this.bad()
        if (!this.ctx.struct.db) throw this.bad()

        this.ctx.struct.db.indexes.push(fieldNo)

        return this
    }

    query(id: number, name: string, params: TypeNamedType, returns: TypeNamedType) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.queries) throw this.bad()

        this.ctx.queries[id] = {
            name, params, returns
        }

        if (id > 65535) {
            throw new Error("can't have ids greater than 65535")
        }

        return this
    }


    version(name: number, fields: number[]) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.types) throw this.bad()
        if (!this.ctx.struct) throw this.bad()
        
        if (name == 0) {
            throw new Error("reserved constructor")
        }

        this.ctx.struct.constructors[name] = Object.fromEntries(
            fields.map(f => [f, true])
        )

        return this
    }

    field(fieldId: number, name: string, type: Type, desc: string = "", meta: FieldMeta = {}) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.types) throw this.bad()
        if (!this.ctx.struct) throw this.bad()
        if (!this.ctx.fields) throw this.bad()
        
        this.ctx.fields[fieldId] = {
            fieldId, name, type, meta, desc
        }

        return this
    }


    enum(typeId: number, name: string) {
        if (!this.ctx.ns) throw this.bad()
 
        // Add the enum ordinal
        const e: TypeEnum = {
            kind: "enum",
            nsId: this.ctx.ns.nsId,
            typeId,
            name,
            values: {}, 
        } 

        this.spec[this.ctx.ns.nsId].types[typeId] = e
        this.ctx.enum = e
        this.ctx.values = e.values

        // this.ctx.enum.fields[0] = {
        //     fieldId: 0,
        //     name: "enumOrdinal",
        //     type: Int32(),
        //     desc: "", meta: {}
        // }

        // this.ctx.enum.e.fields[1] = {
        //     fieldId: 0,
        //     name: "data",
        //     type: Nullable(Array(Any())),
        //     desc: "", meta: {}
        // }

        return this
    }

    value(id: number, name: string, type?: Type, desc: string = "", meta: FieldMeta = {}) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.enum) throw this.bad()
        if (!this.ctx.values) throw this.bad()  

        // TODO(canty) check valid enum types
        // e.g. don't allow enums

        this.ctx.enum.values[id] = {
            name, type, desc: "" 
        } 

        return this
    }

    services() {
        if (!this.ctx.ns) throw this.bad()
        this.ctx.services = {}

        const ns = this.spec[this.ctx.ns.nsId]
        if (ns.layer < Layer.Svc) {
            throw new Error("services can only be defined in the service layer or above")
        }

        return this
    }

    service(svcId: number, name: string, head: ServiceHead) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.services) throw this.bad()
 
        this.spec[this.ctx.ns.nsId].services[svcId] = {
            name, svcId, ...head, methods: {}, requires: []
        }

        this.ctx.service = this.spec[this.ctx.ns.nsId].services[svcId]

        return this
    }

    requires(svc: TypeNamedSvc) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.service) throw this.bad()

        this.ctx.service.requires.push(svc)
        return this
    }

    serviceGroups() {
        if (!this.ctx.ns) throw this.bad()
        this.spec[this.ctx.ns.nsId].serviceGroups = []

        this.ctx.serviceGroups = this.spec[this.ctx.ns.nsId].serviceGroups

        

        return this
    }

    serviceGroup(svcGroupId: number, name: string, services: string[]) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.serviceGroups) throw this.bad()
        
        this.spec[this.ctx.ns.nsId].serviceGroups[svcGroupId] = {
            svcGroupId,
            name, services: services.map((s) => Svc(s))
        }

        return this
    }

    method(id: number, name: string, params: Type, returns: Type) {
        if (!this.ctx.ns) throw this.bad()
        if (!this.ctx.services) throw this.bad()
        if (!this.ctx.service) throw this.bad()

        this.spec[this.ctx.ns.nsId].services[this.ctx.service.svcId].methods[id] = {
            name, params, returns
        }

        return this
    }

    bad() {
        return new Error("invalid ctx")
    }

    async build(root: string) {
        await new SpecUtils(this.spec).build(root)
    }
}

export enum PII {
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
    kind: "bool"
    meta?: TypeBoolMeta
}

interface TypeIdMeta {
    idOf?: TypeNamedType
}



export interface TypeStrMeta extends TypeBaseMeta {
}

export interface TypeStr {
    kind: "str"
    meta?: TypeStrMeta
}


export interface TypeId {
    kind: "id"
    contains?: Type
}

export interface TypeAny {
    kind: "any"
}

export interface TypeInt32Meta extends TypeBaseMeta {
    min?: number
    max?: number
}

export interface TypeInt32 {
    kind: "int32"
    meta?: TypeInt32Meta
}

export interface TypeDictMeta extends TypeBaseMeta { }

export interface TypeDict {
    kind: "dict"
    contains: Type
    meta?: TypeDictMeta
}

// None type is exclusively reserved for empty typed enums
export interface TypeEmpty {
    kind: "empty"
}

export interface TypeRaw {
    kind: "raw"
}

export interface TypeAny {
    kind: "any"
}

export interface TypeNullable {
    kind: "nullable"
    contains: Type
}

export interface TypeArrayMeta extends TypeBaseMeta {
    min?: number
    max?: number
}

export interface TypeArray {
    kind: "array"
    contains: Type
    meta?: TypeArrayMeta
}

export interface TypeStreaming {
    kind: "streaming"
    contains: Type
}

export type Type = TypeStr | TypeId | TypeBool | TypeInt32 | TypeNamedType | TypeDefinable | TypeAny | TypeRaw | TypeEmpty | TypeAny | TypeDict | TypeArray | TypeNullable 
export type TypeDefinable = TypeStruct | TypeEnum



export interface TypeNamedType {
    kind: "namedType"
    name: string
}

export interface TypeNamedSvc {
    kind: "namedSvc"
    ref: string
    implicitNs: boolean
}

export interface Field {
    fieldId: number
    name: string
    type: Type
    meta: FieldMeta
    desc: string
}

export interface Query {
    name: string
    params: TypeNamedType
    returns: TypeNamedType
}

export interface Queue {
    name: string
    type: Type
}

export interface ServiceGroup {
    svcGroupId: number
    name: string
    services: TypeNamedSvc[]
}

interface TypeDefMetaDb {
    
}

interface Db {
    // Fields for IDs
    primary?: number
    shard?: number
    indexes: number[][]
}

export interface TypeStruct {
    kind: "struct"
    nsId: number
    typeId: number
    name: string
    fields: Record<number, Field>
    db?: Db
    mutations: Record<number, Mutation>
    queries: Record<number, Query>
    constructors: Record<number, Record<number, boolean>>
}

export interface TypeEnum {
    kind: "enum"
    nsId: number
    typeId: number
    name: string
    values: Record<number, EnumValue>
}

export interface EnumValue {
    name: string
    type?: Type
    meta?: FieldMeta
    desc: string 
}

export interface DefDb {

}

export interface Mutation {
    name: string
    params: TypeNamedType
}

export interface Enum {
    name: string
    fields: Field[]
}

export interface Namespace {
    nsId: number

    // TODO(canty) order these
    name: string
    types: Record<number, TypeDefinable>

    services: Record<number, Service>
    queries: Record<number, Query>
    queues: Record<number, Queue>
    files?: string
    layer: Layer
    entrypoint: string
    explicitDependsOnNs: NS[]

    db: boolean


    serviceGroups: Record<number, ServiceGroup>
}

export interface FieldMeta {
    deprecated?: boolean
}

export function Bool(meta?: TypeBoolMeta): TypeBool {
    return { kind: "bool", meta }
}

export function Raw(): TypeRaw {
    return { kind: "raw" }
}

export function Any(): TypeAny {
    return { kind: "any" }
}

export function Str(meta?: TypeStrMeta): TypeStr {
    return { kind: "str", meta }
}

export function Nullable(contains: Type): TypeNullable {
    if (contains.kind == "nullable") {
        throw new Error("cannot nest nullables.")
    }

    return { kind: "nullable", contains }
}

export function Int32(meta?: TypeInt32Meta): TypeInt32 {
    return { kind: "int32", meta }
}

export function Array(contains: Type, meta?: TypeArrayMeta): TypeArray {
    return { kind: "array", contains, meta }
}

export function Dict(contains: Type, meta?: TypeDictMeta): TypeDict {
    return { kind: "dict", contains, meta }
}


// "Special" types

export function Id(): TypeId {
    // const vals = Object.values(flags)

    return {
        kind: "id"
        // meta: {
        //     primary: "primary" in vals,
        //     shard: "shard" in vals
        // }
    }
}

// Exclude "primary" because we want primaries to be globally unique
export function IdOf(t: TypeNamedType): TypeId {
    let id = Id()
    id.contains = t
    return id
}

export function T(id: string): TypeNamedType {
    return {
        kind: "namedType",
        name: id
    }
}

export function Svc(id: string): TypeNamedSvc {
    let implicitNs = false
    if (!id.includes("/")) {
        implicitNs = true
    }

    return {
        kind: "namedSvc",
        ref: id,
        implicitNs
    }
}

export interface ServiceHead {
    description?: string
    config: Type
}

export interface Service extends ServiceHead {
    svcId: number
    name: string
    methods: Record<number, Method>
    requires: TypeNamedSvc[]
}

export interface Method {
    name: string
    params: Type
    returns: Type
}

interface SqlSchema {
    tbl: string
    primary: SqlColumn
    shard: SqlColumn
    
    rootColumnGroup: SqlColumnGroup
}

interface SqlColumnGroup {
    kind: "colGroup"
    type: Type
    name: string
    cols: Record<string, SqlColumn>
    childColumnGroups: Record<string, SqlColumnGroup>
    serializer: (g: SqlColumnGroup, s: string) => string
    deserializer: (g: SqlColumnGroup, s: string, d: string) => string
}

interface SqlColumn {
    name: string
    // field?: Field,
    // parentFields?: Field[]
    accessorKey: string,
    type: Type,
    sqlType: string,
    sqlFlags: string,
    primary?: boolean,
    shard?: boolean
    internal?: boolean
}

export class SpecUtils {
    inLayer: Array<Array<Namespace>> = []
    
    types: Record<string, TypeDefinable> = {}
    svcs: Record<string, [number, number, Service]> = {}

    methods: Array<Method> = []
    dependsOn: Array<Namespace[]> = []

    constructor(
        readonly namespaces: Record<string, Namespace>
    ) {
        this.index() 
    }

    // Index namespaces and perform sanity checks
    index() {
        console.log("Starting index")
        const start = new Date()

        // Build in layer index
        for (let i = 0; i < Layer._LAST_LAYER; i++) {
            this.inLayer[i] = []
        }

        const nsNamed = (ns: Namespace, suffix: string) => {
            return ns.name + "/" + suffix
        }

        // Build types and svcs index
        for (const [nsId, ns] of entries(this.namespaces)) {
       

            for (const [typeId, type] of entries(ns.types)) {
                this.types[nsNamed(ns, type.name)] = type
            }

            for (const [svcId, svc] of entries(ns.services)) {
                this.svcs[nsNamed(ns, svc.name)] = [nsId, svcId, svc]
            }

            this.inLayer[ns.layer][nsId] = ns
        }
        
        // Recursively replacees any named type defs with their actual type def instance
        // adds a dependency from originNs to the target namespace
        const resolveNamedTypeDef = (t: Type, originNs: Namespace, ): Type => {
            if (t.kind == "namedType") {
                const lookupKey = t.name.includes("/") ? t.name : nsNamed(originNs, t.name)

                if (lookupKey in this.types) {
                    console.log(`replacing ${lookupKey}`)
                    return this.types[lookupKey]
                } else {
                    throw new Error(`could not resolve named type reference ${t.name}`)
                }
            } else if ("contains" in t && t.contains !== undefined) {
                return {
                    ...t, 
                    contains: resolveNamedTypeDef(t.contains, originNs)
                }
            } else {
                return t
            }
        }


        for (const [nsId, ns] of entries(this.namespaces)) {
            for (const [typeId, type] of entries(ns.types)) {

                if (type.kind == "struct") {
                    for (const [fId, f] of entries(type.fields)) {
                        f.type = resolveNamedTypeDef(f.type, ns)
                    }
                } else if (type.kind == "enum") {
                    for (const [vId, v] of entries(type.values)) {
                        if (v.type) {
                            v.type = resolveNamedTypeDef(v.type, ns)
                        }
                    }
                }

                // // The db service needs to import any types used for queries
                // if (nsId != NS.db.toString()) {
                //     for (const [queryId, q] of entries(type.queries)) {
                //         this.nsDependAdd(NS.db.toString(), nsId)
                //     }
                // }
            }

            for (const [svcId, svc] of entries(ns.services)) {
                svc.config = resolveNamedTypeDef(svc.config, ns)

                for (const [methodId, method] of entries(svc.methods)) {
                    method.params = resolveNamedTypeDef(method.params, ns)
                    method.returns = resolveNamedTypeDef(method.returns, ns)
                }
            }

            for (let dep of ns.explicitDependsOnNs) {
                this.nsDependAdd(ns, this.ns(dep))
            }


            // Also depend on the layer packages above
            for (let layer = ns.layer; Layer._FIRST_LAYER < layer; layer--) {
                if (layer in LayerNS) {
                    this.nsDependAdd(ns, this.ns(LayerNS[layer]))
                } 
            }

            // If its a service it needs rpcclient, rpcserver
            if (entries(ns.services).length > 0) {
                this.nsDependAdd(ns, this.ns(NS.rpcclient))
                this.nsDependAdd(ns, this.ns(NS.rpcserver))

                // Deploy needs to import all service configs 
                // this.nsDependAdd(NS.deploy.toString(), nsId)
            }

            if (ns.db) {
                this.nsDependAdd(ns, this.ns(NS.dbwrapper))
            }
        }

        // Sanity checks: no model can be composed entirely of nullable fields
        // for (const [nsId, ns] of entries(this.namespaces)) {
        //     for (const [tId, def] of entries(ns.typeDefs)) {
        //         let nullCount = 0
        //         for (const [fId, f] of entries(def.fields)) {
        //             if (f.type.kind == "nullable") {
        //                 nullCount++
        //             }
        //         }

        //         if (nullCount == entries(def.fields).length) {
        //             throw new Error(`at least one field in the typedef must be non-nullable (failed on ${def.name})`)
        //         }
        //     }
        // }

        // Sanity check: ensure all enums have a 0 value
        // for (const [nsId, ns] of entries(this.namespaces)) {
        //     for (const [tId, def] of entries(ns.typeDefs)) {
        //         if (!def.enumValues) return

        //         if (!(0 in def.enumValues)) {
        //             throw new Error(`every enum needs a default field number of 0 (failed on ${def.name})`)
        //         }
        //     }
        // }    

        // Sanity check, ensure all dbs have a primary and shard key
        for (const [nsId, ns] of entries(this.namespaces)) {
            for (const [tId, type] of entries(ns.types)) {
                if (type.kind != "struct") continue

                if (type.db) {
                    if (type.db.primary == undefined) {
                        throw new Error(`def ${type.name} is missing a primary key`)
                    }

                    if (type.db.shard == undefined) {
                        throw new Error(`def ${type.db.shard} is missing a shard key`)
                    }
                    
                    // todo check indexs and that primary/shard aren't null
                    const fields = [
                        type.db.primary, type.db.shard, ...Object.keys(type.db.indexes)
                    ]

                    


                }
            }
        }    


        // TODO(ocanty) Check for circular dependencies by topologically sorting
        const end = new Date()

        console.log(`Indexing took: ${(end.getUTCMilliseconds() - start.getUTCMilliseconds())}MS`)
    }

    nsDependAdd(originNs: Namespace, targetNs: Namespace) {
        if (originNs.nsId === targetNs.nsId) return

        this.nsLayerViolationCheck(originNs, targetNs)

        this.dependsOn[originNs.nsId] = this.dependsOn[originNs.nsId] || {}
        this.dependsOn[originNs.nsId][targetNs.nsId] = targetNs
    }

    nsLayerViolationCheck(originNs: Namespace, targetNs: Namespace) {
        if (targetNs.layer > originNs.layer) {
            throw new Error(`layering violation detected between ${originNs.name} and ${targetNs.name}.
Namespace "${originNs.name}" is in layer ${this.layerName(originNs.layer)} but depends on namespace "${targetNs.name}"
in above layer ${this.layerName(targetNs.layer)}.`)
        }
    }

    layerName(l: Layer): string {
        return Layer[l]
    }

    // Returns all the dependencies that a namespace has
    public nsDepends(ns: Namespace): Namespace[] {
        if (ns.nsId in this.dependsOn) {
            return this.dependsOn[ns.nsId]
        }

        return []
    }

    layerNamespaces(l: Layer): Namespace[] {
        return this.inLayer[l]
    }


    resolveNamedSvc(t: TypeNamedSvc, impliedNsName: string = ""): [number, number, Service] {
        const fqRef = t.implicitNs ? impliedNsName + "/" + t.ref : t.ref

        if (this.svcs[fqRef] == undefined) {
            throw new Error(`could not resolve named type reference ${t.ref}`)
        }

        return this.svcs[fqRef]
    }
    
    ns(nsId: number): Namespace {
        //SpecUtils.a += 1
        const ret = this.namespaces[nsId]
        if (!ret) {
            throw new Error(`no such namespace ${nsId}`)
        }

        //console.log(new Error().stack)
    
        //console.log(SpecUtils.a)
        return ret
    }


    type(nsId: number, typeId: number): TypeDefinable {
        const n = this.ns(nsId)
        const model = n.types?.[typeId]
        if (!model) throw new Error(`no such typedef (${nsId},${typeId})`)

        return model
    }


    async build(root: string) {
        const n = new Date().getMilliseconds()
        console.log("Starting codegen!")

        let release = () => {}

        const lockfile = "/tmp/_dev_codegen"

        if (!fs.existsSync(lockfile)) {
            fs.mkdirSync(lockfile)
        }

        if (!fs.existsSync(root)) {
            throw new Error(`${root} does not exist`)
        }

        process.chdir(root)
        
        try {
            release = await lock.lock(lockfile)
            
            await (new Generator(this, RelRW.make(root))).emit()
            
            console.error(`Codegen finished in ${(new Date().getMilliseconds() - n)/1000} seconds`)
            release()
        } catch (err) {
            console.error(`Codegen failed in ${(new Date().getMilliseconds() - n)/1000} seconds: ${err}`)
            console.error((err as Error).stack)
        } finally {
            if (await lock.check(lockfile)) {
                release()
            }
        }
    }
}

function title(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


type EmitCtxPkg = "types" | "service" | "files" | "db" | "serviceGroup"

interface EmitCtx {
    em: Emitter
    pkg?: EmitCtxPkg
    ns?: Namespace
    exports: string[]
}

interface DevCtlConfig {
    groups: Record<string, { projects: string[] }>
    projects: Record<string, { command: { cmd: Record<string, string> }}>
}


class Generator {
    constructor(
        readonly s: SpecUtils,
        readonly w: RelRW
    ) { }

    emitCtx(path: string, pkg: EmitCtxPkg, ns: Namespace, defaultExport: boolean = true): EmitCtx {
        const em = new Emitter(this.w, path)
        if (defaultExport) {
            em.line("export default {}")
        }
        return {
            em, pkg, ns, exports: []
        }
    }

    async emit() {
        console.log("Starting emission...")

        let devCtlConfig: DevCtlConfig = {
            groups: {},
            projects: {}
        }


        for (let i = 0; i < Layer._LAST_LAYER; i++) {
            console.log(`Emitting ${this.s.layerName(i)}`)
            const layerNamespaces = this.s.layerNamespaces(i)
            console.log(`Layer namespaces:`)
            console.log(`${Object.values(layerNamespaces).map(n => n.name).join(", ")}`)

            // Pass: generate root & service packages for each namespace in the layer
            for (const [nsId, ns] of entries(layerNamespaces)) this.emitNamespacePackages(devCtlConfig, ns)
     
            // Pass: generate (model, ) types for each package
            for (const [nsId, ns] of entries(layerNamespaces)) this.emitNamespaceTypes(ns)

            // Pass: database repos
            for (const [nsId, ns] of entries(layerNamespaces)) this.emitNamespaceDb(ns)

            // Pass: files
            // for (const [nsId, ns] of entries(layerNamespaces)) await this.emitNamespaceFiles(ns)

            // Pass: services
            for (const [nsId, ns] of entries(layerNamespaces)) this.emitNamespaceServices(ns)

        }

        // Pass: service groups
        const deployNs = this.s.ns(NS.deploy)
        for (const [svcGroupId, svcGroup] of entries(deployNs.serviceGroups)) {
            this.emitServiceGroup(deployNs, svcGroup)
        }

        for (let i = 0; i < Layer._LAST_LAYER; i++) {
            const layerNamespaces = this.s.layerNamespaces(i)
            // Last pass: manifests
            // The pass must be the last because it needs to be aware of every file that should be
            // exported
            for (const [nsId, ns] of entries(layerNamespaces)) this.emitNamespaceManifest(ns)
        }

        this.w.write("./codegen-devctl-config.json", JSON.stringify(devCtlConfig, null, 2))

    }


    /**
     * Emits the package for the namespace and any packages for its services
     * Also emits a service graph 
     */
    emitNamespacePackages(devCtlConfig: DevCtlConfig, ns: Namespace) {
        const nsPkg = this.namespacePackage(ns)
        devCtlConfig.projects[nsPkg] = {
            command: {
                cmd: {}
            }
        }

        const namespaceDepends = this.s.nsDepends(ns)
        let packageDependencies = Object.fromEntries(
            Object.entries(namespaceDepends).map(([_, ns]) => [`@dev/${this.namespacePackage(ns)}`, "1.0.0"])
        )

        this.emitStubPackage(nsPkg, packageDependencies)
        devCtlConfig.projects[nsPkg].command.cmd["build"] = `cd dev/${nsPkg} && yarn install && yarn run rollup`

        // Make the service packages depend on the namespace package
        // This is required for any types
        packageDependencies[`@dev/${this.namespacePackage(ns)}`] = "1.0.0"

        for (const [svcId, svc] of entries(ns.services)) {
            const svcPkg = this.servicePackage(ns, svc)

            // Build a devctl group for this service and all dependent services
            devCtlConfig.groups[svcPkg] = {
                projects: Object.keys(packageDependencies).map(v => v.split("/")[1])
            }

            this.emitStubPackage(svcPkg, packageDependencies)
            devCtlConfig.projects[nsPkg].command.cmd[`${svc.name}-build`] = `cd dev/${svcPkg} && yarn install && yarn run rollup`
        }

        // Only applies to deploy namespace, emit servicehost stub packages
        for (const [serviceGroupId, serviceGroup] of entries(ns.serviceGroups)) {
            const packageDependencies = Object.fromEntries(
                Object.entries(serviceGroup.services)
                .map(([i,namedSvc]) => [i, this.s.resolveNamedSvc(namedSvc)])
                .map(([i,[nsId, svcId, svc]]) => [i, this.servicePackage(this.s.ns(nsId as number), svc as Service)])
            )

            // const serviceGroupPkg = this.serviceGroupPackage(ns, serviceGroup)

            // // Build a devctl group for this group and all dependent services
            // devCtlConfig.groups[serviceGroupPkg] = {
            //     projects: Object.keys(packageDependencies).map(v => v.split("/")[1])
            // }

            // this.emitStubPackage(serviceGroupPkg, packageDependencies)
            // devCtlConfig.projects[nsPkg].command.cmd[`${serviceGroup.name}-build`] = `cd dev/${serviceGroupPkg} && yarn install && yarn run rollup`
        }
    }

    /**
     * Emit a stub dev package, will override any set package.json/tsconfig.json
     * Does not override dependencies (only existing versions)
     */
    emitStubPackage(pkg: string, dependencies: Record<string, string>) {
        // First emit package.json
        const pkgJsonPath = `./${pkg}/package.json`

        let existingPkgJson: {scripts?: object, dependencies?: object, devDependencies?: object} = {}

        if (this.w.exists(pkgJsonPath)) {
            // pkg json already exists, load it
            existingPkgJson = JSON.parse(this.w.read(pkgJsonPath))
            // console.log(existingPkgJson)
        } else {
            // console.log(pkgJsonPath, "does not exist")
        }
        

        const pkgJson: object = {
            ...existingPkgJson,
            name: `@dev/${pkg}`,
            version: "1.0.0",
            module: "./dist/index.js",
            exports: "./dist/index.js",
            types: "./dist/index.d.ts",
            type: "module",
            sideEffects: false,
            license: "MIT",
            files: [
                "dist/*/**"
            ],
            scripts: {
                ...existingPkgJson?.scripts,
                watch: "nodemon --watch dist/index.js --exec node --delay 0 dist/index.js",
                rollup: "rollup --config ../rollup/rollup.config.js --watch",
                clean: "rm -rf dist"
            },
            devDependencies: {
                ...existingPkgJson?.devDependencies,
                "@types/node": "18.11.7"
            },
            dependencies: {
                ...existingPkgJson?.dependencies,
                ...dependencies
            },
            publishConfig: {
                access: "public"
            }
        }

        this.w.write(pkgJsonPath, JSON.stringify(pkgJson, null, 4))

        // tsconfig.json
        const tsconfigPath = `${pkg}/tsconfig.json`
        this.w.write(tsconfigPath, JSON.stringify({
            extends: "../../tsconfig.node16.json",
            include: ["."],
            exclude: ["dist", "node_modules"],
            compilerOptions: {
                "outDir": "dist/tsout",
            }
        }, null, 2))
    }

    namespacePackage(n: Namespace): string {
        const nsLayerName = this.s.layerName(n.layer).toLowerCase()

        if (n.name == nsLayerName) {
            return nsLayerName
        }


        return `${nsLayerName}-${n.name}`
    }

    servicePackage(n: Namespace, svc: Service) {
        return `${this.namespacePackage(n)}-${svc.name}`
    }

    serviceGroupPackage(n: Namespace, serviceGroup: ServiceGroup) {
        return `${this.namespacePackage(n)}-${serviceGroup.name}`
    }

    emitNamespaceTypes(ns: Namespace) {
        const c = this.emitCtx(`${this.namespacePackage(ns)}/codegen.types.ts`, "types", ns, entries(ns.types).length == 0)
        
        if (ns.layer != Layer.Core && ns.name != "core") {
            c.em.line(`import {ModelId, Id, Model, Nullable, DeepPartial} from "@dev/core"`)
        } else {
            c.em.line(`import {ModelId, Id, Model, Nullable, DeepPartial} from "./model.js"`)
        }

        this.emitTypeDependencies(c)

        for (const [tId, t] of entries(ns.types)) {
            this.emitTypeDef(c, t)
        }
    }

    emitTypeDependencies(c: EmitCtx) {
        if (c.ns == undefined) {
            throw new Error("need to be in a namespace to emit its dependencies")
        }

        const deps = this.s.nsDepends(c.ns)  

        for (const [nsId, ns] of entries(deps)) {
            c.em.line(`import * as _ns_${nsId} from "@dev/${this.namespacePackage(ns)}"`)

            // if (c.ns?.layer !== ns.layer) {
            //     c.em.line(`import * as _ns_${nsId} from "@dev/${this.namespacePackage(ns)}"`)
            // } else {
            //     c.em.line(`import * as _ns_${nsId} from "./codegen.types.js"`)
            // }
        }
    }

    async emitNamespaceFiles(ns: Namespace) {
        if (!ns.files) return

        const c = this.emitCtx(`${this.namespacePackage(ns)}/codegen.files.ts`, "files", ns, !ns.files)

        const filesDir = `${this.namespacePackage(ns)}/embed`

        if (!fs.existsSync(filesDir)) {
            throw new Error(`Embedding files directory ${filesDir} does not exist.`)
        }

        c.em.line(`import { EmbeddedFile, base64ToArrayBuffer } from "@dev/core"`)

        const files = fs.readdirSync(filesDir)
        c.em.line(``)
        
        for (const f of files) {
            console.log(`Embedding file ${filesDir}/${f}`)
            const filePath = path.join(filesDir, f)
            const stat = fs.statSync(filePath)

            if (!stat.isFile()) continue
            // TODO(cocanty) fix race condition / shit async
            
            const sha = await hashFile("sha256", filePath)
            c.em.line(`export const ${f.replace("[^a-zA-Z0-9_.]+", "")}_EmbeddedFile: EmbeddedFile = {`)
            c.em.indent()
            c.em.line(`sha256: "${sha}",`)
            c.em.line(`access: 0o${'0' + (stat.mode & parseInt('777', 8)).toString(8)},`)
            c.em.line(`data: new Int8Array(base64ToArrayBuffer("`)
            
            // urgh
            const data = fs.readFileSync(filePath, { encoding: null})
            c.em.chars(data.toString("base64"))
            
            c.em.chars("\"))")
            c.em.dedent()
            c.em.line(`}`)
        }
    }

    emitNamespaceServices(ns: Namespace) {

        if (ns.layer < Layer.Svc || Object.entries(ns.services).length == 0) return

        // If the service is the database service we need to add an RPC
        // for each query
        if (ns.nsId == NS.db) {

            // TODO(canty): O(N^2) (ish)
            // Add the queries from any of the namespaces in the service layer
            for (const [nsId, ns] of entries(this.s.namespaces)) {
                
                // // For each type in that namespace
                // for (const [tId, t] of entries(ns.types)) {
                //     if (Object.values(t.queries).length > 0) {
                //         // If that type has a query in the namespace
                //         // We need to generate an RPC id for that query
                //         // Namespace -> Type 
                //         // 10000 -> 1
                //         // 10001 
                //         // We assume namespace id is 16bits, model id is 8bits, query id is 8bits
                //         const nsId.to
                //     }
                // }

                // ns.services[0].methods
            }
        }

        let c = this.emitCtx(`${this.namespacePackage(ns)}/codegen.rpcclients.ts`, "service", ns, Object.values(ns.services).length == 0)


        this.emitServiceDependencies(c)
        c.em.line(`import * as _ns_${c.ns?.nsId} from "./codegen.types.js"`)

        // The namespace services definition and clients gets emitted into svcclients
        for (const [svcId, svc] of entries(ns.services)) {
            this.emitServiceInterface(c, svc)
        }
        
        for (const [svcId, svc] of entries(ns.services)) {
            this.emitServiceClient(c, svc)
        }

        for (const [svcId, svc] of entries(ns.services)) {
            c = this.emitCtx(`${this.servicePackage(ns, svc)}/codegen.rpcservers.ts`, "service", ns, Object.values(ns.services).length == 0)
            this.emitServiceDependencies(c)
            c.em.line(`import * as _ns_${c.ns?.nsId} from "@dev/${this.namespacePackage(ns)}"`)

            this.emitServiceServer(c, svc)
        }

        
    }

    emitServiceDependencies(c: EmitCtx) {
        if (c.ns?.nsId == undefined) {
            throw new Error("need to be in a namespace to emit its dependencies")
        }

        const deps = this.s.nsDepends(c.ns)

        for (const [nsId, ns] of entries(deps)) {
            c.em.line(`import * as _ns_${nsId} from "@dev/${this.namespacePackage(ns)}"`)

            // if (c.ns?.layer !== ns.layer) {
            //     c.em.line(`import * as _ns_${nsId} from "@dev/${this.namespacePackage(ns)}"`)
            // } else {
            //     c.em.line(`import * as _ns_${nsId} from "./codegen.types.js"`)
            // }
        }

         
    }

    emitServiceGroup(ns: Namespace, serviceGroup: ServiceGroup) {
        const c = this.emitCtx(`${this.serviceGroupPackage(ns, serviceGroup)}/entrypoint.ts`, "serviceGroup", ns, Object.values(ns.services).length == 0)

        c.em.line(`export async () => {`)
        c.em.line(`}`)

        c.em.close()
        
    }

    
    emitNamespaceManifest(ns: Namespace) {
        // Emit a manifest for the main package of the namespace
        const nsPkg = this.namespacePackage(ns)
        this.emitPackageManifest(nsPkg, ns.entrypoint ? "entrypoint.ts" : undefined)  

        // Emit manifest for each of the service packages for the namespace
        for (const [svcId, svc] of entries(ns.services)) {
            this.emitPackageManifest(this.servicePackage(ns, svc), "entrypoint.ts", false)
        }
        
        // Emit manifest for eaich of the service packages for the namespace
        for (const [svcGroupId, svcGroup] of entries(ns.serviceGroups)) {
            this.emitPackageManifest(this.serviceGroupPackage(ns, svcGroup), "entrypoint.ts", false)
        }

    }

    emitPackageManifest(pkg: string, entrypointFile?: string, createEntrypoint: boolean = true) {
        let em = new Emitter(this.w, `./${pkg}/index.ts`)
        const files = this.w.listDir(`./${pkg}`, ".ts")

        const modules = []

        for (const file of files) {
            if (file.indexOf(" ") > 0) {
                throw new Error("namespace ts cannot have spaces");
            }

            if (file === "index.ts") continue

            const fileLessExt = file.split(".ts")[0]

            const mod = `_${file.replaceAll(".", "_")}`
            //em.line(`import * as ${mod} from "./${fileLessExt}.js"`)
            em.line(`export * from "./${fileLessExt}.js"`)
            modules.push(mod)
        }


        if (entrypointFile) {
            const entrypointPath = `${pkg}/${entrypointFile}`

            if (!this.w.exists(entrypointPath)) {
                if (!createEntrypoint) {
                    throw new Error(`${entrypointFile} entrypoint missing for package ${pkg}`)
                }

                // pkg json already exists, load it
                this.w.write(entrypointPath, "export default async () => {}")
            }
            
            
            em.line(`import entrypoint from "./${entrypointFile.replace(".ts", ".js")}"`)
            em.line(`await entrypoint()`)

        }

        em.close()
    }

    emitServiceInterface(c: EmitCtx, svc: Service) {
        c.em.line(`export interface _${title(svc.name)}Service {`)
        c.em.indent()

        for (const [_, m] of entries(svc.methods)) {
            c.em.line(
                this.svcMethodSignature(c, m)
            )
        }

        c.em.dedent()
        c.em.line(`}`)
        c.em.line()
        c.em.line(`export type _svc_${svc.svcId} = _${title(svc.name)}Service`)
    }

    svcMethodSignature(c: EmitCtx, m: Method) {
        if (/* streaming */false) {

        } else {
            return `${m.name}(p: ${this.type(c, m.params, "class")}): Promise<${this.type(c, m.returns, "class")}>`
        }
    }


    emitServiceServer(c: EmitCtx, svc: Service)  {
        if (!c.ns) return

        c.em.line(`export abstract class ${title(c.ns?.name)}${title(svc.name)}ServerBase`)
        c.em.line(`extends _ns_${NS.rpcserver}.ServerBase implements _ns_${c.ns.nsId}._svc_${svc.svcId} {`)
        c.em.indent()
        
        c.em.line(`constructor(`)
        c.em.indent()
        c.em.line(`public readonly _svcAddr: _ns_${NS.svc}.SvcAddr,`)
        c.em.line(`protected readonly _config: ${this.type(c, svc.config, "class")}`)
        c.em.dedent()
        c.em.line(`) {`)
        c.em.indent()
        c.em.line(`super({`)
        c.em.indent()
        c.em.line(`${c.ns.nsId}: {`)
        c.em.indent()
        c.em.line(`${svc.svcId}: {`)
        c.em.indent()
        
        for (const [mId, m] of entries(svc.methods)) {
            c.em.line(`${mId}: (async (p: object): Promise<object> => {`)
            c.em.indent()
            c.em.line(`return {}`)
            c.em.dedent()
            c.em.line(`}),`)
        }

        c.em.dedent()
        c.em.line(`},`)
        c.em.dedent()
        c.em.line(`},`)
        c.em.dedent()
        c.em.line(`})`)
        c.em.line()
        c.em.dedent()
        c.em.line(`}`)

        c.em.line()

        for (const [mId, m] of entries(svc.methods)) {
            // Stub the method
            c.em.line(`${m.name}(p: ${this.type(c, m.params, "class")}): Promise<${this.type(c, m.returns, "class")}> {`)
            c.em.indent()
            c.em.line(`return new ${this.type(c, m.returns, "class")}()`)
            c.em.dedent()
            c.em.line(`}`)
        }

        c.em.line()

        c.em.line() 

        c.em.dedent()
        c.em.line(`}`)
    }

    emitServiceClient(c: EmitCtx, svc: Service) {


        c.em.line(`export class ${title(svc.name)}Client extends _ns_${NS.rpcclient}.ClientBase implements _svc_${svc.svcId} {`)
        c.em.indent()
        c.em.line(`constructor(remote: string) {`)
        c.em.indent()
        c.em.line(`super(remote)`)
        c.em.dedent()
        c.em.line(`}`)

        for (const [mId, m] of entries(svc.methods)) {
            this.emitSvcClientMethod(c, svc, mId, m)
        }

        c.em.dedent()
        c.em.line(`}`)
    }

    emitSvcClientMethod(c: EmitCtx, svc: Service, mId: number, m: Method) {
        c.em.line(`async ${this.svcMethodSignature(c, m)} {`)
        c.em.indent()

        if (/* streaming */false) {

        } else {
            c.em.line(`const ret = new ${this.type(c, m.returns, "class")}()`)

            c.em.line(`const resp = (await this._request(new _ns_${NS.infra}.RpcRequest({`)
            c.em.indent()
            c.em.line(`namespace: ${c.ns?.nsId}, `)
            c.em.chars(`service: ${svc.svcId}, `)
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

    emitTypeDef(c: EmitCtx, type: TypeDefinable) {        
        if (type.kind == "enum") {
            this.emitTypeDefEnum(c, type)
        } else if (type.kind == "struct") {
            this.emitTypeDefStruct(c, type)
        }

        throw new Error("should not happen")
    }

    typeConstruct(t: Type, construct: string): string {
        if (t.kind == "nullable") {
            return `${construct} !== null ? ${this.typeConstruct(t.contains, construct)} : null`
        }

        if (t.kind == "struct") {
            return `${construct}._f`
        }

        return construct
    }

    typeDeserialize(c: EmitCtx, t: Type, serialized: string): string {
        if (t.kind == "nullable") {
            return `${serialized} !== null ? (${this.typeDeserialize(c, t.contains, serialized)}) : null`
        }

        if (t.kind == "struct") {
            return `new ${this.type(c, t, "class")}(${serialized})`
        }

        return serialized
    }

    typeSerialize(c: EmitCtx, t: Type, deserialized: string): string {
        if (t.kind == "nullable") {
            return `${deserialized} !== null ? (${this.typeSerialize(c, t.contains, deserialized)}) : null`
        }

        if (t.kind == "struct") {
            return `new ${this.type(c, t, "class")}(${deserialized})._f`
        }

        return deserialized
    }

    emitTypeDefEnum(c: EmitCtx, type: TypeEnum) {
        if (!c.ns?.nsId) throw new Error("namespace context required")

        const values = type.values
        const fields: Record<string, Field> = {
            0: {
                fieldId: 0,
                name: "enumOrdinal",
                type: Int32(),
                meta: {}, desc: ""
            },
            1: {
                fieldId: 1,
                name: "data",
                type: Nullable(Dict(Any())),
                meta: {}, desc: ""
            }
        }

        let fieldMax = parseInt(Object.keys(fields)[Object.keys(fields).length-1]) + 1
        if (isNaN(fieldMax)) {
            fieldMax = 0
        }
        
        // Export mutable interface
        c.em.line(`export interface ${this.type(c, type, "interfaceMutable")} {`)
        c.em.indent()    
       
        for (const [vId, v] of Object.entries(values)) {
            if (v.type) {
                c.em.line(`is${title(v.name)}(): ${this.type(c, v.type, "interfaceMutable")}`)
            } else {
                c.em.line(`is${title(v.name)}(): boolean`)
            }
        }

        c.em.dedent()
        c.em.line(`}`)
        c.em.line()

        // Export immutable interface
        c.em.line(`export interface ${this.type(c, type, "interfaceImmutable")} {`)
        c.em.indent()

        for (const [vId, v] of Object.entries(values)) {
            if (v.type) {
                c.em.line(`is${title(v.name)}(): ${this.type(c, v.type, "interfaceMutable")}`)
            } else {
                c.em.line(`is${title(v.name)}(): boolean`)
            }
        }

        c.em.dedent()
        c.em.line(`}`)
        c.em.line()

        // Export fields interface
        c.em.line(`export type ${this.type(c, type, "fields")} = [`)
        c.em.indent()

        for (let i = 0; i < fieldMax; i++) {
            if (i in fields) {
                const f = fields[i]
                c.em.line(`${this.type(c, f.type, "fields")},`)
            } else {
                c.em.line(`null,`)
            }
        }

        c.em.dedent()
        c.em.line(`]`)
        c.em.line()

        // Emit the actual class
        c.em.line(`export class ${this.type(c, type, "class")} implements Model, ${this.type(c, type, "interfaceMutable")} {`)
        c.em.indent()

         c.em.line(`_f: ${this.type(c, type, "fields")}`)

        c.em.line(`marshal(): string {`)
        c.em.indent()
        c.em.line(`return JSON.stringify(this.marshalFields())`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`marshalFields(): object {`)
        c.em.indent()
        c.em.line(`return this._f`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`unmarshalFields(o: object): ${this.type(c, type, "interfaceMutable")} {`)
        c.em.indent()
        c.em.line(`this._f = o as ${this.type(c, type, "fields")}; // TODO(ocanty): validate`)
        c.em.line(`return this`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`unmarshal(s: string): ${this.type(c, type, "interfaceMutable")} {`)
        c.em.indent()
        c.em.line(`return this.unmarshalFields(JSON.parse(s))`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`copy(): ${this.type(c, type, "class")} {`)
        c.em.indent()
        c.em.line(`return new ${this.type(c, type, "class")}(structuredClone(this._f))`)
        c.em.dedent()
        c.em.line(`}`)


        for (const [fieldId, f] of entries(fields)) {
            c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
            c.em.indent()
            c.em.line(`return ${this.typeDeserialize(c, f.type, `this._f[${fieldId}]`)}`)
            c.em.dedent()
            c.em.line(`}`)
        }

        // Constructor of the model
        c.em.line(`constructor(o: object[] | any) {`)
        c.em.indent()
        c.em.line(`if (!Array.isArray(o)) throw new Error()`)
        c.em.line(`this._f = o as any`)

        c.em.line(`switch (o.length) {`)
        c.em.indent()
        for (let i = 0; i < fieldMax; i++) {
            if (i in fields) {
                const f = fields[i]
                c.em.line(`case ${i}: this._f.push(${this.default(c, f.type)});`)
            } else {
                c.em.line(`case ${i}: this._f.push(null);`)
            }
        }
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`switch (this.getEnumOrdinal()) {`)
        c.em.indent()
        for (const [vId, v] of entries(values)) {
            c.em.line(`case ${vId}: `)

            if (v.type) {
                c.em.indent()
                c.em.chars(`this._f[1] = new ${this.type(c, v.type, "class")}(o[1])._f break `)
                c.em.dedent()
            }
            c.em.chars("break;")

        }
        c.em.line(`default: throw new Error()`) // TODO(canty): validation error
        c.em.dedent()
        c.em.line(`}`)

        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`nsId(): number { return ${type.nsId} }`)
        c.em.line(`typeId(): number { return ${type.typeId} }`)

        for (const [vId, v] of entries(values)) {
            // Data enum?
            if (v.type) {
                c.em.line(`is${title(v.name)}(): ${this.type(c, v.type, "class")} {`) 
                c.em.indent()
                c.em.line(`return this.getEnumOrdinal() == ${vId} ? this._f[${vId}] : undefined`)
                c.em.dedent()
                c.em.line(`}`)
            } else {
                c.em.line(`is${title(v.name)}(): boolean {`)
                c.em.indent()
                c.em.line(`return this.getEnumOrdinal() == ${vId}`)
                c.em.dedent()
                c.em.line(`}`)
            }
        }

        c.em.line(`static ord = {`)
        c.em.indent()
        for (const [vId, v] of entries(values)) {
            c.em.line(`${v.name}: ${vId},`)
        }
        c.em.dedent()
        c.em.line(`}`)

        for (const [vId, v] of entries(values)) {
            if (v.type && v.type.kind == "struct") {
                const t = v.type
                
                const constr = `${this.type(c, t, "class")}.V0`

                c.em.line(`static ${title(v.name)}(p: ${this.type(c, v.type, "constructor", 0)}) {`)
                c.em.indent()
                c.em.line(`return new ${this.type(c, type, "class")}({ 0: ${vId}, 1: ${constr}(p)._f })`)
                c.em.dedent()
                c.em.line(`}`)
            } else {
                c.em.line(`static ${title(v.name)}() {`)
                c.em.indent()
                c.em.line(`return new ${this.type(c, type, "class")}({ 4095: ${vId} })`)
                c.em.dedent()
                c.em.line(`}`)
            }
        }

    }




    emitTypeDefStruct(c: EmitCtx, type: TypeStruct) {
        if (!c.ns?.nsId) throw new Error("namespace context required")

        

        let fields = type.fields
        //let enumValues = type.enumValues
        let isEnum = false//Object.keys(enumValues).length > 0

        let fieldMax = parseInt(Object.keys(fields)[Object.keys(fields).length-1]) + 1
        if (isNaN(fieldMax)) {
            fieldMax = 0
        }

        // Scan for an ID in this model, we need to emit nominal ID types
        let hasIdType = false
        for (const [fId, f] of entries(fields)) {
            if (f.type.kind == "id" && f.type.contains) {

                if (f.type.contains == type) {
                    c.em.line(`enum __id_${title(type.name)}Id {}`)
                    c.em.line(`export type ${title(type.name)}Id = __id_${title(type.name)}Id & ModelId`)
                    hasIdType = true
                }
            }
        }

        // Export mutable interface
        c.em.line(`export interface ${this.type(c, type, "interfaceMutable")} {`)
        c.em.indent()    
       
        for (const [fId, f] of entries(fields)) {
            c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "interfaceMutable")}`)
            c.em.line(`set${title(f.name)}(${f.name}: ${this.type(c, f.type, "class")}): ${this.type(c, type, "interfaceMutable")}`)
        }

        c.em.dedent()
        c.em.line(`}`)
        c.em.line()

        // Export immutable interface
        c.em.line(`export interface ${this.type(c, type, "interfaceImmutable")} {`)
        c.em.indent()

        for (const [fId, f] of entries(fields)) {
            c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "interfaceImmutable")}`)
        }

        c.em.dedent()
        c.em.line(`}`)
        c.em.line()

        // Export fields interface
        c.em.line(`export type ${this.type(c, type, "fields")} = [`)
        c.em.indent()

        for (let i = 0; i < fieldMax; i++) {
            if (i in fields) {
                const f = fields[i]
                c.em.line(`${this.type(c, f.type, "fields")},`)
            } else {
                c.em.line(`null,`)
            }
        }

        c.em.dedent()
        c.em.line(`]`)
        c.em.line()

        // Emit constructor interfaces
        // TODO(canty): fix shitty hack
        // Add an implicit V0 constructor with all fields
        type.constructors[0] = Object.fromEntries(
            Object.keys(fields).map(k => [parseInt(k), true])
        )

        for (const [consName, consFieldList] of entries(type.constructors)) {
            c.em.line(`export interface ${this.type(c, type, "constructor", consName)} {`)
            c.em.indent()

            for (const [fieldId] of entries(consFieldList)) {
                if (!(fieldId in fields)) {
                    throw new Error(`constructor ${consName} requires non-existent field ${fieldId} in ${type.name}`)
                }

                const f = fields[fieldId]
                if (consName == 0) {
                    c.em.line(`${f.name}?: ${this.type(c, f.type, "class")}`)
                } else {
                    c.em.line(`${f.name}: ${this.type(c, f.type, "class")}`)
                }
            }

            c.em.dedent()
            c.em.line(`}`)
            c.em.line()
        }

        // Emit the actual class
        c.em.line(`export class ${this.type(c, type, "class")} implements Model, ${this.type(c, type, "interfaceMutable")} {`)
        c.em.indent()

        // Add static id generator for when we added an id earlier
        if (hasIdType) {
            c.em.line(`static newId(fromStr?: string ): ${title(type.name)}Id {`)
            c.em.indent()
            c.em.line(`const id = (fromStr !== undefined) ? fromStr : _ns_${NS.core}.uuidv7()`)
            c.em.line(`return id as unknown as ${title(type.name)}Id `)
            c.em.dedent()
            c.em.line(`}`)
        }

        c.em.line(`_f: ${this.type(c, type, "fields")}`)

        c.em.line(`marshal(): string {`)
        c.em.indent()
        c.em.line(`return JSON.stringify(this.marshalFields())`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`marshalFields(): object {`)
        c.em.indent()
        c.em.line(`return this._f`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`unmarshalFields(o: object): ${this.type(c, type, "interfaceMutable")} {`)
        c.em.indent()
        c.em.line(`this._f = o as ${this.type(c, type, "fields")}; // TODO(ocanty): validate`)
        c.em.line(`return this`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`unmarshal(s: string): ${this.type(c, type, "interfaceMutable")} {`)
        c.em.indent()
        c.em.line(`return this.unmarshalFields(JSON.parse(s))`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`copy(): ${this.type(c, type, "class")} {`)
        c.em.indent()
        c.em.line(`return new ${this.type(c, type, "class")}(structuredClone(this._f))`)
        c.em.dedent()
        c.em.line(`}`)


        for (const [fieldId, f] of entries(fields)) {
            c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
            c.em.indent()
            c.em.line(`return ${this.typeDeserialize(c, f.type, `this._f[${fieldId}]`)}`)
            c.em.dedent()
            c.em.line(`}`)

            c.em.line(`set${title(f.name)}(${f.name}: ${this.type(c, f.type, "class")}): ${this.type(c, type, "class")} {`)
            c.em.indent()
            c.em.line(`this._f[${fieldId}] = ${this.typeSerialize(c, f.type, f.name)}`)
            c.em.line(`return this`)
            c.em.dedent()
            c.em.line(`}`)
        }

        // Constructor of the model
        c.em.line(`constructor(o: object[] | any) {`)
        c.em.indent()
        c.em.line(`if (!Array.isArray(o)) throw new Error()`)
        c.em.line(`this._f = o as any`)

        c.em.line(`switch (o.length) {`)
        c.em.indent()
        for (let i = 0; i < fieldMax; i++) {
            if (i in type.fields) {
                const f = type.fields[i]
                c.em.line(`case ${i}: this._f.push(${this.default(c, f.type)});`)
            } else {
                c.em.line(`case ${i}: this._f.push(null);`)
            }
        }
        c.em.dedent()
        c.em.line(`}`)

        c.em.dedent()
        c.em.line(`}`)


        c.em.line(`nsId(): number { return ${type.nsId} }`)
        c.em.line(`typeId(): number { return ${type.typeId} }`)

        // Explicit/versioned constructors  for structs
        for (const [consName, consFieldList] of entries(type.constructors)) {
            c.em.line(`static V${consName}(p: ${this.type(c, type, "constructor", consName)}) {`)
            c.em.indent()
            c.em.line(`return new ${this.type(c, type, "class")}([`)
            c.em.indent()

            for (let i = 0; i < fieldMax; i++) {
                if (i in fields) {
                    const f = fields[i]
                    if (consName == 0) {
                        c.em.line(`p.${f.name} !== undefined ? ${this.typeConstruct(f.type, `p.${f.name}`)} : ${this.default(c, f.type)},`)
                    } else {
                        c.em.line(`${this.typeConstruct(f.type, `p.${f.name}`)},`)
                    }
                } else {
                    c.em.line(`null,`)
                }
            }

            c.em.dedent()
            c.em.line(`])`)
            c.em.dedent()
            c.em.line(`}`)
            
        }

        c.em.dedent()
        c.em.line('}')
        c.em.line()
        c.em.line(`export const __model_${type.typeId} = ${this.type(c, type, "class")}`)
        c.exports.push(this.type(c, type, "class"))
        c.exports.push(`__model_${type.typeId}`)
        c.em.line()

    }

    emitNamespaceDb(ns: Namespace) {
        if (!ns.db) return

        const c = this.emitCtx(`${this.namespacePackage(ns)}/codegen.db.ts`, "db", ns, Object.values(ns.types).length == 0)
        
        if (ns.layer != Layer.Core && ns.name != "core") {
            c.em.line(`import {ModelId, Id, Model, Nullable, DeepPartial} from "@dev/core"`)
        } else {
            c.em.line(`import {ModelId, Id, Model, Nullable, DeepPartial} from "./model.js"`)
        }

        this.emitTypeDependencies(c)
        c.em.line(`import {DbWrapper, sql} from "@dev/infra-dbwrapper"`)
        c.em.line(`import * as _ns_${c.ns?.nsId} from "./codegen.types.js"`)

        for (const [typeId, type] of entries(ns.types)) {
            if (type.kind != "struct") continue

            if (type.db) {
                this.emitTypeDb(c, type)
            }
        }
    }

    typeSqlType(t: Type): string {
        const typeMap: Record<string, string> = {
            "id": "UUID",
            "bool": "BOOLEAN",
            "str": "TEXT",
            "int32": "INTEGER"
        }

        if (t.kind in typeMap) {
            return typeMap[t.kind]
        }

        throw new Error(`unflattened type for ${t.kind}, should not happen`)
    }
    
    sqlTypeTs(s: string): string {
        const typeMap: Record<string, string> = {
            "UUID": "string",
            "BOOLEAN": "bool",
            "TEXT": "string",
            "INTEGER": "number",
            "TIMESTAMPTZ": "number"
        }

        if (s in typeMap) {
            return typeMap[s]
        }

        throw new Error(`should not happen`)
    }

    typeSqlSchema(type: TypeStruct): SqlSchema {
        if (!type.db) {
            throw new Error()
        }

        const rootColumnGroup = this.typeSqlColumnGroup(type)

        // Try to find the primary key, this should be on the root
        for (const [colName, col] of entries(rootColumnGroup.cols)) {
            if (col.kind == "col")
        }


         {
            tbl: `codegen_db_${type.nsId}_${type.typeId}`,
            cols,
            primary, shard
        }

    }
    
    typeSqlColumn(type: Type, name: string, accessorKey: string): SqlColumn {
        switch (type.kind) {
            case "str":
            case "bool":
            case "id":
            case "int32":
                return {
                    kind: "col",
                    type,
                    name, accessorKey,
                    sqlType: this.typeSqlType(type),
                    sqlFlags: "",
                }
            default:
                throw new Error()
        }
    }

    typeSqlColumnGroup(type: TypeDefinable,
        name: string = "",
        accessorKey: string = ""
    ): SqlColumnGroup {
        switch (type.kind) {
            case "struct": {
                const group: SqlColumnGroup = {
                    kind: "colGroup",
                    name: "",
                    cols: {},
                    type,
                    serializer: (t, s) => "",
                    deserializer: (t, s, d) => ""
                }

                for (const [fId, f] of entries(type.fields)) {
                    const col =  this.typeSqlColumn(type,
                        name !== "" ? name + "_" + fId.toString() : fId.toString(),
                        accessorKey != "" ? accessorKey + "." + f.name : f.name
                    )

                    group.cols[col.name] = col
                }

                return group
            }

            case "enum": {
                const group: SqlColumnGroup = {
                    kind: "colGroup",
                    name: "",
                    cols: {},
                    type,
                    serializer: (t, s) => "",
                    deserializer: (t, s, d) => ""
                }                


                group.cols[name] = {
                    kind: "col",
                    name,
                    accessorKey: accessorKey + ".enumOrdinal",
                    type: Int32(),
                    sqlType: "INTEGER",
                    sqlFlags: ""
                }



                for (const [vId, v] of entries(type.values)) {
                    if (v.type) {
                        const col =  this.typeSqlColumn(type,
                            name !== "" ? name + "_" + vId.toString() : vId.toString(),
                            accessorKey != "" ? accessorKey + "." + v.name : v.name
                        )

                        group.cols[col.name] = col
                    }

                }
            }


            default:
                throw new Error(`this type (${type})cannot be used in database rows`)
        }

    }
    
    // sqlColName(parents: Field[], f: Field) {
    //     return `_${[...parents, f].map(f => f.fieldId).join("_")}`
    // }

    // sqlColAccessorKey(parents: Field[], f: Field) {
    //     return `${[...parents, f].map(f => f.name).join(".")}`
    // }

    // sqlSchemaBuild(c: EmitCtx, type: TypeDef): SqlSchema {
        
    // }

    // emitTypeDbRow(c: EmitCtx, type: TypeDef, s: SqlSchema) {
    //     if (!c.ns) return
    //     if (!c.ns.nsId) return
    //     if (!type.db) return
       
    //     let fields = type.fields
    //     let enumValues = type.enumValues
    //     let isEnum = Object.keys(enumValues).length > 0

    //     let fieldMax = parseInt(Object.keys(fields)[Object.keys(fields).length-1]) + 1
    //     if (isNaN(fieldMax)) {
    //         fieldMax = 0
    //     }

    //     const typeConstruct = (t: Type, construct: string): string => {
    //         if (t.kind == "nullable") {
    //             return `${construct} !== null ? ${typeConstruct(t.contains, construct)} : null`
    //         }

    //         if (t.kind == "struct") {
    //             return `${construct}._f`
    //         }

    //         return construct
    //     }

    //     const typeDeserialize = (t: Type, serialized: string): string => {
    //         if (t.kind == "nullable") {
    //             return `${serialized} !== null ? (${typeDeserialize(t.contains, serialized)}) : null`
    //         }

    //         if (t.kind == "struct") {
    //             return `new ${this.type(c, t, "class")}(${serialized})`
    //         }

    //         return serialized
    //     }

    //     const typeSerialize = (t: Type, deserialized: string): string => {
    //         if (t.kind == "nullable") {
    //             return `${deserialized} !== null ? (${typeDeserialize(t.contains, deserialized)}) : null`
    //         }

    //         if (t.kind == "struct") {
    //             return `new ${this.type(c, t, "class")}(${deserialized})._f`
    //         }

    //         return deserialized
    //     }  

        
    //     const emitRowGroup = (title: string, rootF: Field, cols: SqlColumn[]) => {

    //         c.em.line(`export class ${title(type.name)}Row `)
    //         c.em.chars(`implements ${this.type(c, type, "interfaceMutable")} {`)
    //         c.em.indent()
    //         c.em.line(`_s: __schema_${title(type.name)}Row`)

    //         c.em.line(`constructor(_s: __schema_${title(type.name)}Row) {`)
    //         c.em.indent()
    //         c.em.line(`this._s = _s`)
    //         c.em.dedent()
    //         c.em.line(`}`)
    //     }

    //     const deferRowGroup: (() => void)[] = []
        
    //     for (const [_, col] of entries(s.cols)) {
    //         if (!col.field) continue
    //         if (!col.parentFields) continue
            
    //         const f = col.field

    //         if 

    //         if (col.parentFields.length == 0) {
    //             c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
    //             c.em.indent()
    //             c.em.line(`let ret = ${typeDeserialize(f.type, `this._s.${this.sqlColName(col.parentFields, f)}`)}`)
    //             c.em.line(`return ret !== undefined ? ret : ${this.default(c, f.type)}`)
    //             c.em.dedent()
    //             c.em.line(`}`)
    //         } else {
    //             c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
    //             c.em.indent()
    //             c.em.line(`let ret = ${typeDeserialize(f.type, `this._s.${this.sqlColName(col.parentFields, f)}`)}`)
    //             c.em.line(`return ret !== undefined ? ret : ${this.default(c, f.type)}`)
    //             c.em.dedent()
    //             c.em.line(`}`)
    //         }
        

    //     c.em.line(`export class ${title(type.name)}Row =  `)
    //     c.em.chars(`implements ${this.type(c, type, "interfaceMutable")} {`)
    //     c.em.indent()
    //     c.em.line(`_s: __schema_${title(type.name)}Row`)

    //     c.em.line(`constructor(_s: __schema_${title(type.name)}Row) {`)
    //     c.em.indent()
    //     c.em.line(`this._s = _s`)
    //     c.em.dedent()
    //     c.em.line(`}`)

    //     for (const [_, col] of entries(s.cols)) {
    //         if (!col.field) continue
    //         if (!col.parentFields) continue
            
    //         const f = col.field

    //         if (col.parentFields.length == 0) {
    //             c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
    //             c.em.indent()
    //             c.em.line(`let ret = ${typeDeserialize(f.type, `this._s.${this.sqlColName(col.parentFields, f)}`)}`)
    //             c.em.line(`return ret !== undefined ? ret : ${this.default(c, f.type)}`)
    //             c.em.dedent()
    //             c.em.line(`}`)
    //         } else {
    //             c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
    //             c.em.indent()
    //             c.em.line(`let ret = ${typeDeserialize(f.type, `this._s.${this.sqlColName(col.parentFields, f)}`)}`)
    //             c.em.line(`return ret !== undefined ? ret : ${this.default(c, f.type)}`)
    //             c.em.dedent()
    //             c.em.line(`}`)
    //         }

    //         // for (const [vId, v] of entries(enumValues)) {
    //         //     // Data enum?
    //         //     if (v.type) {
    //         //         c.em.line(`is${title(v.name)}(): ${this.type(c, v.type, "class")} {`) 
    //         //         c.em.indent()
    //         //         c.em.line(`return this.getEnumOrdinal() == ${vId} ? this._f[${vId}] : undefined`)
    //         //         c.em.dedent()
    //         //         c.em.line(`}`)
    //         //     } else {
    //         //         c.em.line(`is${title(v.name)}(): boolean {`)
    //         //         c.em.indent()
    //         //         c.em.line(`return this.getEnumOrdinal() == ${vId}`)
    //         //         c.em.dedent()
    //         //         c.em.line(`}`)
    //         //     }
    //         // }

    //     }
        

    //     // for (const [fieldId, f] of entries(fields)) {
    //     //     if 

    //     //     c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
    //     //     c.em.indent()
    //     //     c.em.line(`return ${typeDeserialize(f.type, `this._f[${fieldId}]`)}`)
    //     //     c.em.dedent()
    //     //     c.em.line(`}`)

    //     //     // c.em.line(`set${title(f.name)}(${f.name}: ${this.type(c, f.type, "class")}): ${this.type(c, type, "class")} {`)
    //     //     // c.em.indent()
    //     //     // c.em.line(`this._f[${fieldId}] = ${typeSerialize(f.type, f.name)}`)
    //     //     // c.em.line(`return this`)
    //     //     // c.em.dedent()
    //     //     // c.em.line(`}`)
    //     // }


 

    //     // c.em.line(`marshal(): string {`)
    //     // c.em.indent()
    //     // c.em.line(`return JSON.stringify(this.marshalFields())`)
    //     // c.em.dedent()
    //     // c.em.line(`}`)

    //     // c.em.line(`marshalFields(): object {`)
    //     // c.em.indent()
    //     // c.em.line(`return this._f`)
    //     // c.em.dedent()
    //     // c.em.line(`}`)

    //     // c.em.line(`unmarshalFields(o: object): ${this.type(c, type, "interfaceMutable")} {`)
    //     // c.em.indent()
    //     // c.em.line(`this._f = o as ${this.type(c, type, "fields")}; // TODO(ocanty): validate`)
    //     // c.em.line(`return this`)
    //     // c.em.dedent()
    //     // c.em.line(`}`)

    //     // c.em.line(`unmarshal(s: string): ${this.type(c, type, "interfaceMutable")} {`)
    //     // c.em.indent()
    //     // c.em.line(`return this.unmarshalFields(JSON.parse(s))`)
    //     // c.em.dedent()
    //     // c.em.line(`}`)

    //     // c.em.line(`copy(): ${this.type(c, type, "class")} {`)
    //     // c.em.indent()
    //     // c.em.line(`return new ${this.type(c, type, "class")}(structuredClone(this._f))`)
    //     // c.em.dedent()
    //     // c.em.line(`}`)


    //     // Reflection
    //     // c.em.line(`static __fieldTool = FieldTools.model(() => new ${this.type(c, defType, "class")}())`)
    //     // c.em.indent()
        
    //     // for (const [fieldId, field] of entries(d.fields)) {
    //     //     c.em.line(`.field(${fieldId}, "${field.name}", ${this.type(c, field.type, "fieldTools")})`)
    //     // }

    //     // c.em.dedent()

    //     // Enum ordinal validation
    //     if (isEnum) {
    //         c.em.line(`switch (this.getEnumOrdinal()) {`)
    //         c.em.indent()
    //         for (const [vId, v] of entries(enumValues)) {
    //             c.em.line(`case ${vId}: `)

    //             if (v.type) {
    //                 c.em.indent()
    //                 c.em.chars(`this._f[1] = new ${this.type(c, v.type, "class")}(o[1])._f break `)
    //                 c.em.dedent()
    //             }
    //             c.em.chars("break;")

    //         }
    //         c.em.line(`default: throw new Error()`) // TODO(canty): validation error
    //         c.em.dedent()
    //         c.em.line(`}`)
    //     }

    //     c.em.dedent()
    //     c.em.line(`}`)

    //     c.em.dedent()
    //     c.em.line('}')
    //     c.em.line()
    //     c.em.line(`export const __model_${type.typeId} = ${this.type(c, type, "class")}`)
    //     c.exports.push(this.type(c, type, "class"))
    //     c.exports.push(`__model_${type.typeId}`)
    //     c.em.line()


    // }

    emitTypeDb(c: EmitCtx, type: TypeStruct) {
        if (!c.ns) return
        if (!c.ns.nsId) return
        if (!type.db) return

        // These are base columns we use for internal bookkeeping locking
        let cols: Record<string, SqlColumn> = {
              "timestamp": {
                kind: "col",
                name: "timestamp",
                accessorKey: "row.timestamp",
                type: Int32(),
                sqlType: "TIMESTAMPTZ",
                sqlFlags: "",
                internal: true
            },
            "version": {
                kind: "col",
                name: "version",
                accessorKey: "row.version",
                type: Int32(),
                sqlType: "INTEGER",
                sqlFlags: "DEFAULT 0",
                internal: true
            },
            "universe": {
                kind: "col",
                name: "universe",
                accessorKey: "row.universe",
                type: Int32(),
                sqlType: "INTEGER",
                sqlFlags: "DEFAULT 0",
                internal: true,
            },
            "archived_at": {
                kind: "col",
                name: "archived_at",
                accessorKey: "row.archivedAt",
                type: Int32(),
                sqlType: "TIMESTAMPTZ",
                sqlFlags: "",
                internal: true
            }
        }

        let primary: SqlColumn | undefined
        let shard: SqlColumn | undefined

        const parents: Field[] = []
  

        // const sqlColName = (parents: Field[], f: Field) => {
        //     return `${[...parents, f].map(f => f.fieldId).join("_")}`
        // }

        // const sqlColAccessorKey = (parents: Field[], f: Field) => {
        //     return `${[...parents, f].map(f => f.name).join(".")}`
        // }

        // const sqlColClassName = (parents: Field[], f:Field) => {
        //     return `${[...parents, f].map(f => title(f.name)).join("")}`
        // }

        // const sqlTypeToTsType = (sqlType: string) => {
        //     const typeMap: Record<string, string> = {
        //         "UUID": "string",
        //         "BOOLEAN": "bool",
        //         "TEXT": "string",
        //         "INTEGER": "number",
        //         "TIMESTAMPTZ": "number"
        //     }

        //     if (sqlType in typeMap) {
        //         return typeMap[sqlType]
        //     }

        //     throw new Error(`should not happen`)
        // }

        // const typeToSqlType = (t: Type) => {
        //     const typeMap: Record<string, string> = {
        //         "id": "UUID",
        //         "bool": "BOOLEAN",
        //         "str": "TEXT",
        //         "int32": "INTEGER"
        //     }

        //     if (t.kind in typeMap) {
        //         return typeMap[t.kind]
        //     }

        //     throw new Error(`unflattened type for ${t.kind}, should not happen`)
        // }

        // const newCol = (f: Field) => {
        //     const col: SqlColumn = { 
        //         name: sqlColName(parents, f),
        //         field: f,
        //         parentFields: [...parents],
        //         accessorKey: sqlColAccessorKey(parents, f),
        //         sqlType: typeToSqlType(f.type),
        //         sqlFlags: "",
        //         primary: parents.length == 0 && f.fieldId == type.db?.primary, // can only happen at the root 
        //         shard: parents.length == 0 && f.fieldId == type.db?.shard,
        //         serializer: () => "s",
        //         deserializer: () => "s",
        //     }

        //     cols[col.name] = col

        //     if (col.primary) {
        //         primary = col
        //         col.sqlFlags = "UNIQUE NOT NULL"
        //     } 

        //     if (col.shard) {
        //         shard = col
        //         col.sqlFlags = "UNIQUE NOT NULL"
        //     }
        // }

        // const flattenFieldsIntoSchema = (parent: TypeStruct) => {
        //     // Regular enum
        //     if (entries(parent.enumValues).length == 0) {
        //         for (const [fId, f] of entries(parent.fields)) {
        //             let fType: Type = f.type.kind == "nullable" ? f.type.contains : f.type   
    
        //             if (fType.kind == "struct") { 
        //                 parents.push(f)
        //                 flattenFieldsIntoSchema(fType)
        //                 parents.pop()
        //                 continue
        //             }

        //             newCol(f)
        //         }
        //     } else {
        //         // Add columns for each possible enum

        //     }
        // }

        // flattenFieldsIntoSchema(type)

        // if (!primary) {
        //     throw new Error(`def ${type.name} is missing a primary key`)
        // }

        // if (!shard) {
        //     throw new Error(`def ${type.name} is missing a shard key`)
        // } 
    

        const s: SqlSchema = this.typeSqlType

        // Emit row schema type
        // Emit the actual class (immutable)
        const schemaInterface = `__schema_${title(type.name)}Row`

        c.em.line(`export interface ${schemaInterface} {`)
        c.em.indent()
        for (const [_, col] of entries(s.cols)) {
            c.em.line(`${col.name}?: ${sqlTypeToTsType(col.sqlType)}`)
        }

        c.em.dedent()
        c.em.line(`}`)

        // // Emit row
        // let fields = type.fields
        // let enumValues = type.enumValues
        // let isEnum = Object.keys(enumValues).length > 0

        // // let fieldMax = parseInt(Object.keys(fields)[Object.keys(fields).length-1]) + 1
        // // if (isNaN(fieldMax)) {
        // //     fieldMax = 0
        // // }

        // const typeConstruct = (t: Type, construct: string): string => {
        //     if (t.kind == "nullable") {
        //         return `${construct} !== null ? ${typeConstruct(t.contains, construct)} : null`
        //     }

        //     if (t.kind == "struct") {
        //         return `${construct}._f`
        //     }

        //     return construct
        // }

        const typeDeserialize = (t: Type, serialized: string): string => {
            if (t.kind == "nullable") {
                return `${serialized} !== null ? (${typeDeserialize(t.contains, serialized)}) : null`
            }

            if (t.kind == "struct") {
                return `new ${this.type(c, t, "class")}(${serialized})`
            }

            return serialized
        }

        const typeSerialize = (t: Type, deserialized: string): string => {
            if (t.kind == "nullable") {
                return `${deserialized} !== null ? (${typeDeserialize(t.contains, deserialized)}) : null`
            }

            if (t.kind == "struct") {
                return `new ${this.type(c, t, "class")}(${deserialized})._f`
            }

            return deserialized
        }  

        // // Emit the actual class (immutable)
        // c.em.line(`export interface __schema_${title(type.name)}Row {`)
        // c.em.indent()
        // for (const [_, col] of entries(s.cols)) {
        //     c.em.line(`${col.name}?: ${this.sqlTypeTs(col.sqlType)}`)
        // }

        // c.em.dedent()
        // c.em.line(`}`)

        
        // const emitRowGroup = (title: string, rootF: Field, cols: SqlColumn[]) => {

        //     c.em.line(`export class ${title(type.name)}Row `)
        //     c.em.chars(`implements ${this.type(c, type, "interfaceMutable")} {`)
        //     c.em.indent()
        //     c.em.line(`_s: __schema_${title(type.name)}Row`)

        //     c.em.line(`constructor(_s: __schema_${title(type.name)}Row) {`)
        //     c.em.indent()
        //     c.em.line(`this._s = _s`)
        //     c.em.dedent()
        //     c.em.line(`}`)
        // }

        // const deferRowGroup: (() => void)[] = []
        
        // for (const [_, col] of entries(s.cols)) {
        //     if (!col.field) continue
        //     if (!col.parentFields) continue
            
        //     const f = col.field

        //     if 

        //     if (col.parentFields.length == 0) {
        //         c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
        //         c.em.indent()
        //         c.em.line(`let ret = ${typeDeserialize(f.type, `this._s.${this.sqlColName(col.parentFields, f)}`)}`)
        //         c.em.line(`return ret !== undefined ? ret : ${this.default(c, f.type)}`)
        //         c.em.dedent()
        //         c.em.line(`}`)
        //     } else {
        //         c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
        //         c.em.indent()
        //         c.em.line(`let ret = ${typeDeserialize(f.type, `this._s.${this.sqlColName(col.parentFields, f)}`)}`)
        //         c.em.line(`return ret !== undefined ? ret : ${this.default(c, f.type)}`)
        //         c.em.dedent()
        //         c.em.line(`}`)
        //     }
        

        // c.em.line(`export class ${title(type.name)}Row =  `)
        // c.em.chars(`implements ${this.type(c, type, "interfaceMutable")} {`)
        // c.em.indent()
        // c.em.line(`_s: __schema_${title(type.name)}Row`)

        // c.em.line(`constructor(_s: __schema_${title(type.name)}Row) {`)
        // c.em.indent()
        // c.em.line(`this._s = _s`)
        // c.em.dedent()
        // c.em.line(`}`)

        // for (const [_, col] of entries(s.cols)) {
        //     if (!col.field) continue
        //     if (!col.parentFields) continue
            
        //     const f = col.field

        //     if (col.parentFields.length == 0) {
        //         c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
        //         c.em.indent()
        //         c.em.line(`let ret = ${typeDeserialize(f.type, `this._s.${this.sqlColName(col.parentFields, f)}`)}`)
        //         c.em.line(`return ret !== undefined ? ret : ${this.default(c, f.type)}`)
        //         c.em.dedent()
        //         c.em.line(`}`)
        //     } else {
        //         c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
        //         c.em.indent()
        //         c.em.line(`let ret = ${typeDeserialize(f.type, `this._s.${this.sqlColName(col.parentFields, f)}`)}`)
        //         c.em.line(`return ret !== undefined ? ret : ${this.default(c, f.type)}`)
        //         c.em.dedent()
        //         c.em.line(`}`)
        //     }

        //     // for (const [vId, v] of entries(enumValues)) {
        //     //     // Data enum?
        //     //     if (v.type) {
        //     //         c.em.line(`is${title(v.name)}(): ${this.type(c, v.type, "class")} {`) 
        //     //         c.em.indent()
        //     //         c.em.line(`return this.getEnumOrdinal() == ${vId} ? this._f[${vId}] : undefined`)
        //     //         c.em.dedent()
        //     //         c.em.line(`}`)
        //     //     } else {
        //     //         c.em.line(`is${title(v.name)}(): boolean {`)
        //     //         c.em.indent()
        //     //         c.em.line(`return this.getEnumOrdinal() == ${vId}`)
        //     //         c.em.dedent()
        //     //         c.em.line(`}`)
        //     //     }
        //     // }

        // }
        

        // for (const [fieldId, f] of entries(fields)) {
        //     if 

        //     c.em.line(`get${title(f.name)}(): ${this.type(c, f.type, "class")} {`) 
        //     c.em.indent()
        //     c.em.line(`return ${typeDeserialize(f.type, `this._f[${fieldId}]`)}`)
        //     c.em.dedent()
        //     c.em.line(`}`)

        //     // c.em.line(`set${title(f.name)}(${f.name}: ${this.type(c, f.type, "class")}): ${this.type(c, type, "class")} {`)
        //     // c.em.indent()
        //     // c.em.line(`this._f[${fieldId}] = ${typeSerialize(f.type, f.name)}`)
        //     // c.em.line(`return this`)
        //     // c.em.dedent()
        //     // c.em.line(`}`)
        // }


 

        // c.em.line(`marshal(): string {`)
        // c.em.indent()
        // c.em.line(`return JSON.stringify(this.marshalFields())`)
        // c.em.dedent()
        // c.em.line(`}`)

        // c.em.line(`marshalFields(): object {`)
        // c.em.indent()
        // c.em.line(`return this._f`)
        // c.em.dedent()
        // c.em.line(`}`)

        // c.em.line(`unmarshalFields(o: object): ${this.type(c, type, "interfaceMutable")} {`)
        // c.em.indent()
        // c.em.line(`this._f = o as ${this.type(c, type, "fields")}; // TODO(ocanty): validate`)
        // c.em.line(`return this`)
        // c.em.dedent()
        // c.em.line(`}`)

        // c.em.line(`unmarshal(s: string): ${this.type(c, type, "interfaceMutable")} {`)
        // c.em.indent()
        // c.em.line(`return this.unmarshalFields(JSON.parse(s))`)
        // c.em.dedent()
        // c.em.line(`}`)

        // c.em.line(`copy(): ${this.type(c, type, "class")} {`)
        // c.em.indent()
        // c.em.line(`return new ${this.type(c, type, "class")}(structuredClone(this._f))`)
        // c.em.dedent()
        // c.em.line(`}`)


        // Reflection
        // c.em.line(`static __fieldTool = FieldTools.model(() => new ${this.type(c, defType, "class")}())`)
        // c.em.indent()
        
        // for (const [fieldId, field] of entries(d.fields)) {
        //     c.em.line(`.field(${fieldId}, "${field.name}", ${this.type(c, field.type, "fieldTools")})`)
        // }

        // c.em.dedent()

        // Enum ordinal validation
        // if (isEnum) {
        //     c.em.line(`switch (this.getEnumOrdinal()) {`)
        //     c.em.indent()
        //     for (const [vId, v] of entries(enumValues)) {
        //         c.em.line(`case ${vId}: `)

        //         if (v.type) {
        //             c.em.indent()
        //             c.em.chars(`this._f[1] = new ${this.type(c, v.type, "class")}(o[1])._f break `)
        //             c.em.dedent()
        //         }
        //         c.em.chars("break;")

        //     }
        //     c.em.line(`default: throw new Error()`) // TODO(canty): validation error
        //     c.em.dedent()
        //     c.em.line(`}`)
        // }

        // c.em.dedent()
        // c.em.line(`}`)

        // c.em.dedent()
        // c.em.line('}')
        // c.em.line()
        // c.em.line(`export const __model_${type.typeId} = ${this.type(c, type, "class")}`)
        // c.exports.push(this.type(c, type, "class"))
        // c.exports.push(`__model_${type.typeId}`)
        // c.em.line()

        // this.emitTypeDbRow(c, type, s)

        // Emit database accessor
        c.em.line(`class ${title(type.name)}DbTbl {`) 
        c.em.indent()

        c.em.line(`static tbl = "${s.tbl}"`)

        c.em.line(`static col = {`)
        c.em.indent()
        for (const [colName, {sqlType, field, accessorKey}] of Object.entries(s.cols)) {
            c.em.line(
                `"${accessorKey}": "${colName}",`
            )
        }
        c.em.dedent()
        c.em.line(`}`)

        
        c.em.line(`constructor(readonly dbw: DbWrapper, readonly env: string) {}`)

        const queryStart = () => `await this.dbw.rw(async (c) => { await c.transaction(async (d) => {`
        const queryUnsafeLine = (s: string) => `await d.query(sql.unsafe\`${s}\`)`
        const queryEnd = () => `})})`

        c.em.line(`async schemaCreate() {`)
        c.em.indent()

        c.em.line(queryStart())
        c.em.line(queryUnsafeLine(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`))

        // const primary = s.cols[`_${type.db.primary}`]
        // const shard = s.cols[`_${type.db.shard}`]

        // if (!primary) throw new Error("should not happen")
        // if (!shard) throw new Error("should not happen")        

        if (type.db.primary != type.db.shard) {
            c.em.line(queryUnsafeLine(`CREATE TABLE IF NOT EXISTS ${s.tbl} (
    ${primary.name} ${primary.sqlType} ${primary.sqlFlags},
    ${shard.name} ${shard.sqlType} ${shard.sqlFlags},
    PRIMARY KEY (${primary.name}, ${shard.name})
)`))
        } else  {
            c.em.line(queryUnsafeLine(`CREATE TABLE IF NOT EXISTS ${s.tbl} (
    ${primary.name} ${primary.sqlType} ${primary.sqlFlags},
    PRIMARY KEY (${primary.name})
)`))
        }

        for (const [_, col] of entries(s.cols)) {
            if (primary || shard) continue

            c.em.line(
                queryUnsafeLine(`ALTER TABLE ${s.tbl} ADD COLUMN IF NOT EXISTS ${col.name} ${col.sqlType} ${col.sqlFlags}`)
            )
        }

        // Insert trigger
        c.em.line(queryUnsafeLine(`CREATE OR REPLACE FUNCTION ${s.tbl}_row_insert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.timestamp = now();
    NEW.version = 1;
    RETURN NEW;   
END;
$$ language 'plpgsql'`))

        c.em.line(
            queryUnsafeLine(`DROP TRIGGER IF EXISTS ${s.tbl}_row_insert_trigger ON ${s.tbl}`))
        c.em.line(
            queryUnsafeLine(`CREATE TRIGGER ${s.tbl}_row_insert_trigger" BEFORE INSERT ON ${s.tbl} FOR EACH ROW EXECUTE PROCEDURE ${s.tbl}_row_insert()`))


        // Update trigger
        c.em.line(queryUnsafeLine(`CREATE OR REPLACE FUNCTION ${s.tbl}_row_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.timestamp = now();
    NEW.version = OLD.version + 1;
    RETURN NEW;   
END;
$$ language 'plpgsql'`))

        c.em.line(
            queryUnsafeLine(`DROP TRIGGER IF EXISTS ${s.tbl}_row_update_trigger ON ${s.tbl}`))
        c.em.line(
            queryUnsafeLine(`CREATE TRIGGER ${s.tbl}_row_update_trigger BEFORE UPDATE ON ${s.tbl} FOR EACH ROW EXECUTE PROCEDURE ${s.tbl}_row_update()`))

        // Convert each index into its representative flattened field
        // const indexColNames = type.db.indexes.map((fieldList) => `_${fieldList.join("_")}`)

        // for (const key of indexColNames) {
        //     console.log(key, s)
        //     if (!(key in s)) {
        //         throw new Error(`index ${key} for ${type.name} does not exist`)
        //     }

        //     if (key == `_${type.db.primary}`) {
        //         throw new Error(`index for primary key of ${type.name} is implicit`)
        //     }

        //     if (key == `_${type.db.shard}`) {
        //         throw new Error(`index for primary key of ${type.name} is implicit`)
        //     }
        // }
        
        c.em.line(queryEnd())

        c.em.dedent()
        c.em.line(`}`)

        // note 

        // const queryName = (colNames: string[]): string => {
        //     const col = colNames.map((key) => s[key])

        //     return col.map((c) => {
        //         return title(c.accessorKey)
        //     }).join("And")
        // }


        const prefixStack: string[] = []

        // c.em.line(`static _unmapRecord(i: ${this.type(c, defType, "class")}): Array<any> {`)
        // c.em.indent()
        // c.em.line(`const ret =`)
        
	// static _mapRecord(row: Array<any>): _ns_30008.ServiceDeployment {
	// 	const s = _ns_30008.ServiceDeployment.V0()
	// 	s.unmarshalFields({
	// 		0: row["_0"],
	// 		1: row["_1"],
	// 		2: ServiceDeploymentDb._mapObj({
	// 			0: row["_2_0"],
	// 			1: row[""]
	// 		})
	// 	})
	// 	return s
	// }`)

        // const queryParam = (colName: string): string => {
        //     const col = cols[colName]

        //     return title(col)
        // }

        // const andNames = (colNames: string[]) => {
        //     return `${colNames.map((key) => s[key]).map((col) => title(col.accessorKey.replaceAll(".", ""))).join("And")}`
        // }

        // const emitFindQuery = (colNames: string[], first: boolean, optionalReturn: boolean, overrideName?: string, ) => {
        //     const method = overrideName || `findBy${andNames(colNames)}`

        //     let ret = {
        //         id: "indexedType",
        //         nsId: c.ns?.nsId,
        //         typeId: type.typeId
        //     }

        //     // const params = colNames.map(col => {
        //     //     const colMeta = schema[col]
        //     //     return `${colMeta.accessorKey.replace(".", "")}: ${this.type(c, colMeta.field.type, "class")}`
        //     // })
            

        //     // c.em.line(`static ${method}(db: Db, ${params.join(", ")}) {`)
        //     // c.em.indent()
        //     // c.em.line(`db.query().where`))
        //     // c.em.dedent()
        //     // c.em.line(`}`)
            
        // }

        // const compoundKey = (type.db.primary != type.db.shard ? [type.db.primary.toString(), type.db.shard.toString()] : [type.db.primary.toString()])


        // emitFindQuery(compoundKey, true, true)

        // Get all subsets of the indexes

        /*
        emitFindQuery(t.db.indexes)*/

        // findQuery([t.db.indexes.toString(), t.db.shard.toString()], true, true,
        

        // c.em.line(`mutate(c: (o: ${title(type.name)}DbRow)) {`)
        // c.em.indent()
        // c.em.line(`db.query().where`)
        // c.em.dedent()
        // c.em.line(`}`)
        c.em.line(`schemaSerialize(o: ${schemaInterface}): ${this.type(c, type, "class")} {`)
        c.em.indent()

        c.em.line(`return new ${this.type(c, type, "class")}([`)

        
            
        c.em.line(`])`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.line(`schemaDeserialize(o: ${this.type(c, type, "class")}): ${schemaInterface} {`)
        c.em.indent()
        c.em.line(`return {`)
        c.em.indent()

        c.em.dedent()
        c.em.line(`}`)
        c.em.dedent()
        c.em.line(`}`)

        c.em.dedent()
        c.em.line(`}`)
        c.em.line()
    }

    // typeEqual(t1: Type, t2: Type): boolean {
    //     if (t1.id !== t2.id) {
    //         return false
    //     }

    //     switch (t1.id) {
    //         case "indexedType":
    //             return this.typeModelEqual(t1, t2 as TypeModel)

    //         default:
    //             return true
    //     }
    // }

    // typeModelEqual(t1: TypeModel, t2: TypeModel): boolean {
    //     return t1.typeId == t1.typeId && t2.packageId == t2.packageId
    // }

    typeCategory(
        c: EmitCtx,
        t: Type
    ): "value" | "mutReference" {
        switch (t.kind) {
            case "any":
            case "array":
            case "dict":
            case "namedType":
                return "mutReference"
            
            case "nullable":
                return this.typeCategory(c, t.contains)
        }

        return "value"
    }

    init(
        c: EmitCtx,
        t: Type,
        value: string
    ): string {
        switch (t.kind) {
            case "any":
            case "raw":
            case "str":
            case "int32":
            case "id":
            case "str":
                return `(${value})`

            case "nullable":
                return `(${value} !== undefined ? (${this.init(c, t.contains, value)}) : undefined)`

            case "array":
                return "[]"

            case "dict":
                return "{}"

            case "namedType":
                throw new Error()

            case "struct":
            case "enum":
                const prefix = c.ns?.nsId && (c.ns.nsId !== t.nsId || c.pkg !== "types") ? `_ns_${t.nsId}.` : ``

                return `new ${prefix}${title(t.name)}(${value})`

            default: 
                throw new Error("should not happen")
        }
    }

    default(
        c: EmitCtx,
        t: Type,
    ): string {
        switch (t.kind) {
            case "any":
                return "undefined"

            case "raw":
                return "{}"

            case "bool":
                return "false"

            case "str":
                return `""`

            case "id": {
                if (t.contains) {
                    if (t.contains.kind != "struct") throw new Error()
                    const def = t.contains
                    
                    const prefix = c.ns?.nsId && (c.ns.nsId !== def.nsId || c.pkg !== "types") ? `_ns_${def.nsId}.` : ``

                    return `("00000000-0000-0000-0000-000000000000" as any as ${prefix}${title(t.contains.name)}Id)`
                }

                return `"00000000-0000-0000-0000-000000000000"`
            }

            case "nullable":
                return "null"

            case "int32":
                return "0"

            case "array":
                return "[]"

            case "dict":
                return "{}"

            case "namedType":
                throw new Error()

            case "struct":
            case "enum":
                const prefix = c.ns?.nsId && (c.ns.nsId !== t.nsId || c.pkg !== "types") ? `_ns_${t.nsId}.` : ``

                return `new ${prefix}${title(t.name)}([])._f`

            default: 
                throw new Error("should not happen")
        }
    }

    type(
        c: EmitCtx,
        t: Type,
        defMode: "class" | "interfaceMutable" | "interfaceImmutable" | "fields" | "fieldsSerialized" | "constructor" | "constructorDbRow"  = "class",
        consName?: number,
        postFixDef?: string
    ): string {
        switch (t.kind) {
            case "any":
                return `any`

            // case "streaming":
            //     return this.type(c, t.contains)

            case "raw":
                return `string`

            case "bool":
                return `boolean`

            case "str":
                return `string`


            case "id": {
                if (t.contains) {
                    console.log(t.contains)
                    if (t.contains.kind != "struct") throw new Error("expected a def")
                    const def = t.contains
                    const prefix = c.ns?.nsId && (c.ns.nsId !== def.nsId || c.pkg !== "types") ? `_ns_${def.nsId}.` : ``

                    return `${prefix}${title(def.name)}Id`
                }

                return `string`
            }

            case "nullable":
                return "Nullable<" + this.type(c, t.contains, defMode, consName) + ">"

            case "int32":
                return `number`

            case "array":
                return "Array<" + this.type(c, t.contains, defMode, consName) + ">"

            case "dict":
                return "Record<string, " + this.type(c, t.contains, defMode, consName) + ">"

            case "empty":
                return "{}"

            case "namedType":
                throw new Error(`found namedType:${t.kind} ${t.name}`)
                // return this.type(c, this.s.resolveNamedType(t, c.ns?.name), defMode, consName)

            case "struct":
            case "enum":
                const prefix = c.ns?.nsId && (c.ns.nsId !== t.nsId || c.pkg !== "types") ? `_ns_${t.nsId}.` : ``

                switch (defMode) {
                    case "class":
                        return `${prefix}${title(t.name)}`

                    case "fieldsSerialized":
                        return `${prefix}_fieldsSerialized_${title(t.name)}`

                    case "fields":
                        return `${prefix}_fields_${title(t.name)}`

                    case "interfaceMutable":
                        return `${prefix}__mutable_${title(t.name)}`

                    case "interfaceImmutable":
                        return `${prefix}__immutable_${title(t.name)}`

                    case "constructor":
                        if (consName == undefined) {
                            throw new Error("no constructor name specified")
                        }

                        return `${prefix}__constructor_${title(t.name)}_${consName}`

                    case "constructorDbRow":
                        if (consName == undefined) {
                            throw new Error("no constructor name specified")
                        }

                        return `${prefix}__constructor_${title(t.name)}DbRow_${consName}`

                    default:
                        return "unknown"
                }
        }
    }



    // typeSql(c: EmitCtx, t: Type, nullable: boolean = false): string {
    //     let type = ""

    //     switch (t.kind) {
    //         // Container/ambigious types need to be flattened
    //         case "any":
    //         case "streaming":
    //         case "raw":
    //         case "array":
    //         case "empty":
    //         case "namedType":
    //         case "dict":
    //         case "nullable":
    //         case "indexedType":
    //             throw new Error(`${t.kind} is not allowed in table rows, (flattening required?)`)

    //         case "bool":
    //             type += `BOOLEAN DEFAULT(${this.defaultSql(c,t)})`
    //             break

    //         case "id":
    //             type += `UUID DEFAULT(${this.defaultSql(c, t)})`
    //             break;

    //         case "str":
    //             type += `TEXT DEFAULT(${this.defaultSql(c,t)})`
    //             break

    //         case "int32":
    //             type += `INT32 DEFAULT(${this.defaultSql(c,t)})`
    //             break


    //         // default:
    //         //     throw new Error(`unhandled type ${t.kind}`)
    //     }

    //     return nullable ? type : `${type} NOT NULL `
    // }   
}

