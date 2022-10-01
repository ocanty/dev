"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var gluedrpcclient_exports = {};
__export(gluedrpcclient_exports, {
  Core: () => __exports4,
  Hostd: () => __exports2,
  Lang: () => __exports5,
  Netcop: () => __exports3,
  Rpc: () => __exports,
  _ns_0: () => __exports,
  _ns_1: () => __exports2,
  _ns_10: () => __exports3,
  _ns_100: () => __exports5,
  _ns_75: () => __exports4
});
module.exports = __toCommonJS(gluedrpcclient_exports);

// ts/0.ts
var __exports = {};

// ts/1.ts
var __exports2 = {};
__export(__exports2, {
  Client: () => Client2
});

// client.ts
var import_glued = require("@dev/glued");
var import_isomorphic_ws = __toESM(require("isomorphic-ws"));
var import_ulid = require("ulid");
var Client = class {
  constructor(remote) {
    this.remote = remote;
    this.connected = false;
    this.pending = {};
    this.ws = new import_isomorphic_ws.default(
      `wss://${remote}`
    );
    this.ws.on("open", this.open.bind(this));
    this.ws.on("message", this.message.bind(this));
    this.ws.on("close", this.close.bind(this));
    this.ws.on("error", this.error.bind(this));
  }
  newRequestId() {
    return (0, import_ulid.ulid)();
  }
  open() {
    this.connected = true;
  }
  error(data) {
    console.log("error: ", data);
  }
  message(data) {
    try {
      const resp = new import_glued.Rpc.Response();
      resp._unmarshal(data);
      if (resp.id in this.pending) {
        const resolve = this.pending[resp.id][0];
        const reject = this.pending[resp.id][1];
        delete this.pending[resp.id];
        if (resp.result.error) {
          reject(new Error(`${resp.result.error.code}: ${resp.result.error.message}`));
        } else if (resp.result.ok) {
          resolve(resp);
        }
      } else {
        console.log("Unhandled message: ", resp);
      }
    } catch (e) {
      console.log("unhandled error: ", e);
    }
  }
  close() {
    this.connected = false;
  }
  async request(r) {
    return new Promise((resolve, reject) => {
      if (r.id in this.pending) {
        console.log("tried to resend request, ", r.id);
      } else {
        this.ws.send(r._marshal());
        this.pending[r.id] = [resolve, reject];
      }
    });
  }
};

// ts/1.ts
var import_glued2 = require("@dev/glued");
var import_glued3 = require("@dev/glued");
var Client2 = class extends Client {
  constructor(remote) {
    super(remote);
  }
  async kvget(p) {
    const ret = new import_glued3._ns_1.Kv();
    const resp = (await this.request(new import_glued2._ns_0.Request({
      namespace: 1,
      service: 0,
      method: 0,
      params: p._marshalFields()
    }))).result;
    ret._unmarshalFields(resp);
    return ret;
  }
  async kvset(p) {
    const ret = new import_glued3._ns_1.Kv();
    const resp = (await this.request(new import_glued2._ns_0.Request({
      namespace: 1,
      service: 0,
      method: 1,
      params: p._marshalFields()
    }))).result;
    ret._unmarshalFields(resp);
    return ret;
  }
};

// ts/10.ts
var __exports3 = {};
__export(__exports3, {
  Client: () => Client3
});
var import_glued4 = require("@dev/glued");
var import_glued5 = require("@dev/glued");
var Client3 = class extends Client {
  constructor(remote) {
    super(remote);
  }
  async test(p) {
    const ret = new import_glued5._ns_1.Kv();
    const resp = (await this.request(new import_glued4._ns_0.Request({
      namespace: 10,
      service: 0,
      method: 0,
      params: p._marshalFields()
    }))).result;
    ret._unmarshalFields(resp);
    return ret;
  }
};

// ts/75.ts
var __exports4 = {};

// ts/100.ts
var __exports5 = {};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Core,
  Hostd,
  Lang,
  Netcop,
  Rpc,
  _ns_0,
  _ns_1,
  _ns_10,
  _ns_100,
  _ns_75
});
