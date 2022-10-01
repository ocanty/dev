"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// lib.ts
var fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var lock = __toESM(require("proper-lockfile"));
var SpecBuilder = class {
  constructor() {
    this.ctx = {};
    this.spec = {};
  }
  namespace(id, name) {
    this.spec[id] = this.spec[id] || { name: "whatever", types: {}, services: {} };
    this.spec[id].name = name;
    this.ctx = { namespace: { id } };
    return this;
  }
  files(path2) {
    var _a;
    if (((_a = this.ctx) == null ? void 0 : _a.namespace) == void 0)
      throw this.bad();
    this.spec[this.ctx.namespace.id].files = path2;
    return this;
  }
  types() {
    var _a;
    if (((_a = this.ctx) == null ? void 0 : _a.namespace) == void 0)
      throw this.bad();
    this.ctx.namespace = { id: this.ctx.namespace.id, types: {} };
    return this;
  }
  model(id, name) {
    var _a, _b;
    if (((_b = (_a = this.ctx) == null ? void 0 : _a.namespace) == null ? void 0 : _b.types) == void 0)
      throw this.bad();
    this.spec[this.ctx.namespace.id].types[id] = {
      name,
      fields: {},
      enum: false,
      meta: {}
    };
    this.ctx.namespace.types = { model: { id } };
    return this;
  }
  db() {
    var _a, _b, _c;
    if (((_c = (_b = (_a = this.ctx) == null ? void 0 : _a.namespace) == null ? void 0 : _b.types) == null ? void 0 : _c.model) == void 0)
      throw this.bad();
    this.spec[this.ctx.namespace.id].types[this.ctx.namespace.types.model.id].meta.db = {};
    return this;
  }
  field(id, name, type, meta = {}) {
    var _a, _b, _c;
    if (((_c = (_b = (_a = this.ctx) == null ? void 0 : _a.namespace) == null ? void 0 : _b.types) == null ? void 0 : _c.model) == void 0)
      throw this.bad();
    this.spec[this.ctx.namespace.id].types[this.ctx.namespace.types.model.id].fields[id] = {
      name,
      type,
      meta
    };
    this.ctx.namespace.types.model = {
      id: this.ctx.namespace.types.model.id,
      fields: { id }
    };
    return this;
  }
  enum(id, name) {
    var _a, _b;
    if (((_b = (_a = this.ctx) == null ? void 0 : _a.namespace) == null ? void 0 : _b.types) == void 0)
      throw this.bad();
    this.spec[this.ctx.namespace.id].types[id] = {
      name,
      fields: {},
      enum: true,
      meta: {}
    };
    this.ctx.namespace.types = {
      enum: { id }
    };
    return this;
  }
  value(id, name, type, meta = {}) {
    var _a, _b, _c;
    if (((_c = (_b = (_a = this.ctx) == null ? void 0 : _a.namespace) == null ? void 0 : _b.types) == null ? void 0 : _c.enum) == void 0)
      throw this.bad();
    this.spec[this.ctx.namespace.id].types[this.ctx.namespace.types.enum.id].fields[id] = {
      name,
      meta,
      type: Nullable(type)
    };
    return this;
  }
  services() {
    var _a;
    if (((_a = this.ctx) == null ? void 0 : _a.namespace) == void 0)
      throw this.bad();
    this.ctx.namespace = { id: this.ctx.namespace.id, services: {} };
    return this;
  }
  service(id, name, head) {
    var _a, _b;
    if (((_b = (_a = this.ctx) == null ? void 0 : _a.namespace) == null ? void 0 : _b.services) == void 0)
      throw this.bad();
    this.ctx.namespace.services = {
      service: { id }
    };
    this.spec[this.ctx.namespace.id].services[id] = {
      name,
      ...head,
      methods: {}
    };
    return this;
  }
  method(id, name, params, returns) {
    var _a, _b, _c;
    if (((_c = (_b = (_a = this.ctx) == null ? void 0 : _a.namespace) == null ? void 0 : _b.services) == null ? void 0 : _c.service) == void 0)
      throw this.bad();
    this.spec[this.ctx.namespace.id].services[this.ctx.namespace.services.service.id].methods[id] = {
      name,
      params,
      returns
    };
    return this;
  }
  bad() {
    return new Error("invalid ctx");
  }
  async build(root) {
    await new WSpec(this.spec).build(root);
  }
};
var RpcNsId = 0;
var RpcNsName = "rpc";
function Spec() {
  return new SpecBuilder().namespace(RpcNsId, RpcNsName).types().model(0, "request").field(0, "version", Int32()).field(1, "id", Str()).field(2, "namespace", Int32()).field(3, "service", Int32()).field(4, "method", Int32()).field(5, "params", Any()).model(1, "response").field(0, "version", Int32()).field(1, "id", Str()).field(2, "result", Types(`${RpcNsName}/result`)).model(2, "error").field(0, "code", Int32()).field(1, "message", Str()).enum(3, "result").value(0, "error", Types(`${RpcNsName}/error`)).value(1, "ok", Any());
}
function Any() {
  return { id: "any" };
}
function Str(meta) {
  return { id: "str", meta };
}
function Nullable(contains) {
  return { id: "nullable", contains };
}
function Int32(meta) {
  return { id: "int32", meta };
}
function ID(prefix, attr) {
  return {
    id: "str",
    meta: {
      id: {
        prefix,
        attr
      }
    }
  };
}
function Types(id) {
  return {
    id: "namedRef",
    ref: id
  };
}
var WriterFile = class {
  constructor(basePath) {
    this.basePath = basePath;
    this.seen = {};
  }
  static make(basePath) {
    const wf = new WriterFile(basePath);
    const baseRealPath = fs.realpathSync(wf.basePath);
    const basepathExists = wf.exists(baseRealPath);
    if (!basepathExists) {
      throw new Error("base path does not exist.");
    }
    wf.basePath = baseRealPath;
    return wf;
  }
  exists(path2) {
    try {
      fs.accessSync(path2);
      return true;
    } catch (e) {
      return false;
    }
  }
  write(relPath, s) {
    const filePath = import_path.default.join(this.basePath, relPath);
    if (!(filePath in this.seen)) {
      const fd = fs.openSync(filePath, "w+");
      this.seen[filePath] = fd;
    }
    fs.appendFileSync(this.seen[filePath], s);
  }
  close(path2) {
    if (path2 in this.seen) {
      try {
        fs.closeSync(this.seen[path2]);
      } catch (err) {
        console.warn(`Error closing fd: (${path2}, ${this.seen[path2]}): ${err}`);
      }
      delete this.seen[path2];
    }
  }
};
var WSpec = class {
  constructor(namespaces) {
    this.namespaces = namespaces;
    this.types = {};
    this.methods = {};
    this.dependsOn = {};
    this.indexBuild();
    this.nsDepsGraphBuild();
  }
  nsDeps(nsId) {
    if (nsId in this.dependsOn) {
      return this.dependsOn[nsId];
    }
    return {};
  }
  typeHasTypeNamedRef(t) {
    if (t.id == "namedRef") {
      return this.typeResolveNamedRef(t);
    }
    if ("contains" in t) {
      return this.typeHasTypeNamedRef(t.contains);
    }
  }
  typeResolveNamedRef(t) {
    if (this.types[t.ref] == void 0) {
      throw new Error(`could not resolve named type reference ${t.ref}`);
    }
    const [nsId, modelNo, type] = this.types[t.ref];
    return {
      id: "def",
      nsId,
      typeId: modelNo
    };
  }
  typeIsDef(t) {
    if (t.id == "def") {
      return t;
    } else if (t.id == "namedRef") {
      return this.typeResolveNamedRef(t);
    }
  }
  nsDependsOn(originNsId, targetNsId) {
    if (originNsId === targetNsId)
      return;
    this.dependsOn[originNsId] = this.dependsOn[originNsId] || {};
    this.dependsOn[originNsId][targetNsId] = this.namespace(targetNsId);
  }
  indexBuild() {
    this.types = {};
    this.dependsOn = {};
    this.methods = {};
    for (const [nsId, ns] of Object.entries(this.namespaces)) {
      const keyName = (s) => {
        return ns.name + "/" + s;
      };
      for (const [typeId, type] of Object.entries(ns.types)) {
        this.types[keyName(type.name)] = [nsId, typeId, type];
      }
    }
  }
  nsDepsGraphBuild() {
    const checkAndMarkDep = (t, originNsId) => {
      const tNR = this.typeHasTypeNamedRef(t);
      if (tNR) {
        this.nsDependsOn(originNsId, tNR.nsId);
      }
    };
    for (const [nsId, ns] of Object.entries(this.namespaces)) {
      for (const [typeId, type] of Object.entries(ns.types)) {
        for (const [fieldId, f] of Object.entries(type.fields)) {
          checkAndMarkDep(f.type, nsId);
        }
      }
      for (const [svcId, svc] of Object.entries(ns.services)) {
        checkAndMarkDep(svc.config, nsId);
        for (const [methodId, method] of Object.entries(svc.methods)) {
          checkAndMarkDep(method.params, nsId);
          checkAndMarkDep(method.returns, nsId);
        }
      }
      if (nsId != RpcNsId.toString()) {
        this.nsDependsOn(nsId, RpcNsId.toString());
      }
    }
  }
  namespaceName(namespaceId) {
    const s = this.namespaces[namespaceId].name;
    if (!s) {
      throw new Error(`no namespace ${namespaceId}`);
    }
    return s;
  }
  namespace(namespaceNo) {
    const ret = this.namespaces[namespaceNo];
    if (!ret) {
      throw new Error(`no such namespace ${ret}`);
    }
    return ret;
  }
  modelDef(namespaceNo, modelNo) {
    var _a;
    const n = this.namespace(namespaceNo);
    const model = (_a = n.types) == null ? void 0 : _a[modelNo];
    if (!model) {
      throw new Error(`no such modeldef (${namespaceNo},${modelNo})`);
    }
    return model;
  }
  async build(path2) {
    const n = new Date();
    console.log("Starting build!");
    let release = () => {
    };
    try {
      release = await lock.lock("dist");
      for (const t of [
        new TargetTS(this, WriterFile.make(path2)),
        new TargetSQL(this, WriterFile.make(path2))
      ]) {
        t.emit();
      }
      console.log(`Build finished in ${(new Date().getMilliseconds() - n.getMilliseconds()) / 1e3} seconds`);
      release();
    } catch (err) {
      console.log(`Build failed in ${(new Date().getMilliseconds() - n.getMilliseconds()) / 1e3} seconds: ${err}`);
    } finally {
      if (await lock.check("dist")) {
        release();
      }
    }
  }
};
function title(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
var TargetSQL = class {
  constructor(s, w) {
    this.s = s;
    this.w = w;
    this.targetId = "sql";
  }
  emitManifest(path2) {
    let manifestEm = new Emitter(this.w, path2);
    for (const [nsId, ns] of Object.entries(this.s.namespaces)) {
      manifestEm.line(`export * as ${title(ns.name)} from "./${nsId}"`);
      manifestEm.line(`export * as _ns_${nsId} from "./${nsId}"`);
    }
    manifestEm.close();
  }
  emitCtx(path2, nsId, ns) {
    return {
      em: new Emitter(this.w, path2),
      nsId,
      ns
    };
  }
  emit() {
    this.emitManifest("./glueddb/sql/manifest.ts");
    for (const [nsId, ns] of Object.entries(this.s.namespaces)) {
      let sCtx = this.emitCtx(`./glueddb/sql/${nsId}.ts`, nsId, ns);
      sCtx.em.line("--global['_blahblah']; export default`");
      for (const [tId, t] of Object.entries(ns.types)) {
        if (t.meta.db) {
          this.emitModel(sCtx, tId, t);
        }
      }
      sCtx.em.line("--`");
      sCtx.em.close();
    }
  }
  flattenFields(t) {
    const ret = {};
    return ret;
  }
  emitModel(c, tId, t) {
    if (t.enum)
      return;
    const tblName = `GLUE_${c.nsId}_${tId}`;
    c.em.line(`CREATE TABLE IF NOT EXISTS ${tblName} ();`);
    for (const [fId, f] of Object.entries(t.fields)) {
      c.em.line(`ALTER TABLE ${tblName} ADD COLUMN ${fId} ${this.type(c, f.type)};`);
    }
  }
  type(c, t, isNull = false) {
    let type = "";
    switch (t.id) {
      case "any":
      case "streaming":
      case "namedRef":
      case "raw":
      case "array":
      case "dict":
        throw new Error(`${t.id} is not allowed in table rows`);
      case "def":
        throw new Error(`${t.id} table should be flattened`);
      case "bool":
        type += `BOOLEAN DEFAULT(${this.default(c, t)})`;
        break;
      case "str":
        type += `TEXT DEFAULT(${this.default(c, t)})`;
        break;
      case "nullable":
        return this.type(c, t.contains, true);
      case "int32":
        type += `INT32 DEFAULT(${this.default(c, t)})`;
        break;
    }
    return isNull ? type : `${type} NOT NULL `;
  }
  default(c, t) {
    let type = "";
    switch (t.id) {
      case "any":
      case "streaming":
      case "namedRef":
      case "raw":
      case "array":
      case "dict":
        throw new Error(`${t.id} is not allowed in table rows`);
      case "def":
        throw new Error(`${t.id} table should be flattened`);
      case "bool":
        return "False";
      case "str":
        return "''";
      case "nullable":
        return "NULL";
      case "int32":
        return "0";
    }
  }
};
var TargetTS = class {
  constructor(s, w) {
    this.s = s;
    this.w = w;
    this.targetId = "ts";
  }
  emitDepImports(c) {
    if (c.nsId == void 0) {
      throw new Error("need to be in a namespace to emit its dependencies");
    }
    const deps = this.s.nsDeps(c.nsId);
    for (const [nsId, ns] of Object.entries(deps)) {
      if (c.pkg !== "glued") {
        c.em.line(`import { _ns_${nsId} } from "@dev/glued"`);
      } else {
        c.em.line(`import * as _ns_${nsId} from "./${nsId}"`);
      }
    }
    if (c.pkg !== "glued") {
      c.em.line(`import { _ns_${c.nsId} } from "@dev/glued"`);
    }
  }
  emitCtx(path2, pkg, nsId, ns) {
    const em = new Emitter(this.w, path2);
    em.line("export {}");
    return {
      em,
      nsId,
      pkg,
      ns
    };
  }
  emit() {
    this.emitManifest("./glued/ts/manifest.ts");
    this.emitManifest("./gluedrpcserver/ts/manifest.ts");
    this.emitManifest("./gluedrpcclient/ts/manifest.ts");
    this.emitManifest("./gluedfiles/ts/manifest.ts");
    for (const [nsId, ns] of Object.entries(this.s.namespaces)) {
      let gCtx = this.emitCtx(`./glued/ts/${nsId}.ts`, "glued", nsId, ns);
      let cCtx = this.emitCtx(`./gluedrpcclient/ts/${nsId}.ts`, "gluedrpcclient", nsId, ns);
      let sCtx = this.emitCtx(`./gluedrpcserver/ts/${nsId}.ts`, "gluedrpcserver", nsId, ns);
      cCtx.em.line(`import { Client as BaseClient } from "../client"`);
      sCtx.em.line(`import { Server as BaseServer } from "../server"`);
      gCtx.em.line(`import * as _M from "../model"`);
      this.emitDepImports(gCtx);
      for (const [tId, t] of Object.entries(ns.types)) {
        this.emitType(gCtx, tId, t);
      }
      for (const [svcId, svc] of Object.entries(ns.services)) {
        this.emitSvcInterface(gCtx, svcId, svc);
        this.emitDepImports(cCtx);
        this.emitSvcClient(cCtx, svcId, svc);
        this.emitDepImports(sCtx);
      }
      let fCtx = this.emitCtx(`./gluedfiles/ts/${nsId}.ts`, "gluedfiles", nsId, ns);
      let _ = [gCtx, cCtx, sCtx, gCtx, fCtx].forEach((c) => c.em.close());
    }
  }
  emitManifest(path2) {
    let manifestEm = new Emitter(this.w, path2);
    for (const [nsId, ns] of Object.entries(this.s.namespaces)) {
      manifestEm.line(`export * as ${title(ns.name)} from "./${nsId}"`);
      manifestEm.line(`export * as _ns_${nsId} from "./${nsId}"`);
    }
    manifestEm.close();
  }
  async emitFiles(c, nsId, ns) {
    if (!ns.files)
      return;
  }
  svcMethodSignature(c, m) {
    if (m.params.id == "streaming") {
      return `${m.name}(): Promise<void>`;
    } else {
      return `${m.name}(p: ${this.type(c, m.params, "class")}): Promise<${this.type(c, m.returns, "class")}>`;
    }
  }
  emitSvcInterface(c, svcId, svc) {
    c.em.line(`export interface Svc${title(svc.name)} {`);
    c.em.indent();
    for (const [_, m] of Object.entries(svc.methods)) {
      c.em.line(
        this.svcMethodSignature(c, m)
      );
    }
    c.em.dedent();
    c.em.line(`}`);
    c.em.line();
    c.em.line(`export type _svc_${svcId} = Svc${title(svc.name)}`);
  }
  emitSvcClient(c, svcId, svc) {
    c.em.line(`export class Client extends BaseClient implements _ns_${c.nsId}._svc_${svcId} {`);
    c.em.indent();
    c.em.line(`constructor(remote: string) {`);
    c.em.indent();
    c.em.line(`super(remote)`);
    c.em.dedent();
    c.em.line(`}`);
    for (const [mId, m] of Object.entries(svc.methods)) {
      this.emitSvcClientMethod(c, svcId, mId, m);
    }
    c.em.dedent();
    c.em.line(`}`);
  }
  emitSvcClientMethod(c, svcId, mId, m) {
    c.em.line(`async ${this.svcMethodSignature(c, m)} {`);
    c.em.indent();
    if (m.params.id == "streaming") {
    } else {
      c.em.line(`const ret = new ${this.type(c, m.returns, "class")}()`);
      c.em.line(`const resp = (await this.request(new _ns_${RpcNsId}.Request({`);
      c.em.indent();
      c.em.line(`namespace: ${c.nsId}, `);
      c.em.chars(`service: ${svcId}, `);
      c.em.chars(`method: ${mId},`);
      c.em.line(`params: p._marshalFields()`);
      c.em.dedent();
      c.em.line(`}))).result`);
      c.em.line();
      c.em.line(`ret._unmarshalFields(resp)`);
      c.em.line();
      c.em.line(`return ret`);
    }
    c.em.dedent();
    c.em.line(`}`);
  }
  emitType(c, mId, m) {
    if (!c.nsId) {
      throw new Error("namespace context required");
    }
    const mType = {
      id: "def",
      nsId: c.nsId,
      typeId: mId
    };
    c.em.line(`interface ${this.type(c, mType, "interface")} {`);
    c.em.indent();
    for (const [fId, f] of Object.entries(m.fields)) {
      c.em.line(`${f.name}: ${this.type(c, f.type, "interface")}`);
    }
    c.em.dedent();
    c.em.line(`}`);
    c.em.line();
    c.em.line(`export class ${this.type(c, mType, "class")} `);
    c.em.chars(`extends _M.Model implements ${this.type(c, mType, "interface")} {`);
    c.em.indent();
    c.em.line(`constructor(o?: _M.DeepPartial<${this.type(c, mType, "interface")}>) {`);
    c.em.indent();
    c.em.line(`super("${c.nsId}/${mType.typeId}", ${this.type(c, mType, "class")}.fieldTool, o)`);
    c.em.dedent();
    c.em.line(`}`);
    for (const [fieldId, field] of Object.entries(m.fields)) {
      c.em.line(`${field.name}!: ${this.type(c, field.type, "class")}`);
    }
    c.em.line(`static fieldTool = _M.FieldTools.model(() => new ${this.type(c, mType, "class")}())`);
    c.em.indent();
    for (const [fieldId, field] of Object.entries(m.fields)) {
      c.em.line(`.field("${fieldId}", "${field.name}", ${this.type(c, field.type, "fieldTools")})`);
    }
    c.em.dedent();
    if (m.enum) {
      for (const [fieldId, field] of Object.entries(m.fields)) {
        if (field.type.id == "nullable") {
          c.em.line(`static ${title(field.name)}(p: ${this.type(c, field.type.contains, "interface")}) {`);
          c.em.indent();
          c.em.line(`return new ${this.type(c, mType, "class")}({ ${field.name}: p })`);
          c.em.dedent();
          c.em.line(`}`);
        }
      }
    }
    c.em.dedent();
    c.em.line("}");
    c.em.line();
    c.em.line(`export const _model_${mId} = ${this.type(c, mType, "class")}`);
    c.em.line();
  }
  type(c, t, modelMode = "class") {
    let fieldTools = modelMode === "fieldTools";
    switch (t.id) {
      case "any":
        return !fieldTools ? `any` : "() => _M.FieldTools.any";
      case "streaming":
        return this.type(c, t.contains);
      case "raw":
        return !fieldTools ? `string` : "() => _M.FieldTools.raw";
      case "bool":
        return !fieldTools ? "boolean" : "() => _M.FieldTools.bool";
      case "str":
        return !fieldTools ? "string" : "() => _M.FieldTools.str";
      case "nullable":
        return !fieldTools ? "_M.Nullable<" + this.type(c, t.contains, modelMode) + ">" : "() => _M.FieldTools.nullable(" + this.type(c, t.contains, modelMode) + ")";
      case "int32":
        return !fieldTools ? "number" : "() => _M.FieldTools.int32";
      case "array":
        return !fieldTools ? "Array<" + this.type(c, t.contains, modelMode) + ">" : "() => _M.FieldTools.array(" + this.type(c, t.contains, modelMode) + ")";
      case "dict":
        return !fieldTools ? "Record<string," + this.type(c, t.contains, modelMode) + ">" : "() => _M.FieldTools.dict(" + this.type(c, t.contains, modelMode) + ")";
      case "namedRef":
        return this.type(c, this.s.typeResolveNamedRef(t), modelMode);
      case "def":
        const modelDef = this.s.modelDef(t.nsId, t.typeId);
        const prefix = c.nsId && (c.nsId !== t.nsId || c.pkg !== "glued") ? `_ns_${t.nsId}.` : ``;
        switch (modelMode) {
          case "class":
            return `${prefix}${title(modelDef.name)}`;
          case "interface":
            return `${prefix}_${title(modelDef.name)}`;
          case "fieldTools":
            return `() => ${prefix}${title(modelDef.name)}.fieldTool`;
          default:
            return "unknown";
        }
    }
  }
};
var Emitter = class {
  constructor(w, path2) {
    this.w = w;
    this.path = path2;
    this._indent = 0;
  }
  indent() {
    this._indent++;
  }
  dedent() {
    this._indent--;
    this._indent = Math.max(0, this._indent);
  }
  line(s = ``) {
    this.w.write(this.path, "\n" + "	".repeat(this._indent) + s);
  }
  chars(s) {
    this.w.write(this.path, s);
  }
  close() {
    this.w.close(this.path);
  }
};

// index.ts
(async () => {
  await Spec().namespace(1, "hostd").types().model(0, "config").field(0, "consul", Str()).model(1, "k").field(0, "k", Str()).model(2, "kv").field(0, "key", Str()).field(1, "value", Str()).services().service(0, "hostd", {
    config: Types("hostd/config")
  }).method(0, "kvget", Types("hostd/k"), Types("hostd/kv")).method(1, "kvset", Types("hostd/kv"), Types("hostd/kv")).namespace(10, "netcop").files("./files/netcop").types().model(0, "config").services().service(0, "srv", {
    config: Types("netcop/config")
  }).method(0, "test", Types("hostd/k"), Types("hostd/kv")).namespace(100, "api").types().model(0, "none").model(1, "ok").field(0, "message", Str()).model(2, "error").field(0, "message", Str()).field(0, "code", Int32()).enum(3, "test").value(0, "ok", Str()).namespace(75, "core").types().model(0, "acct").db().field(0, "id", ID("acct", { type: "primary" })).model(1, "acctHead").field(0, "name", Str({ pii: 0 /* ANY_PII */ })).namespace(100, "lang").types().model(0, "proj").db().field(0, "id", ID("proj", { type: "primary" })).field(1, "acctId", ID("acct", { type: "rel", rel: Types("core/acct") })).model(1, "projHead").field(0, "name", Str()).model(2, "func").field(0, "id", ID("func", { type: "primary" })).field(1, "projId", ID("proj", { type: "rel", rel: Types("lang/proj") })).build("../");
})();
