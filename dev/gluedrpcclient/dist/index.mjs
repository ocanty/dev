var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ts/0.ts
var __exports = {};

// ts/1.ts
var __exports2 = {};
__export(__exports2, {
  Client: () => Client2
});

// client.ts
import { Rpc } from "@dev/glued";
import Websocket from "isomorphic-ws";
import { ulid } from "ulid";
var Client = class {
  constructor(remote) {
    this.remote = remote;
    this.connected = false;
    this.pending = {};
    this.ws = new Websocket(
      `wss://${remote}`
    );
    this.ws.on("open", this.open.bind(this));
    this.ws.on("message", this.message.bind(this));
    this.ws.on("close", this.close.bind(this));
    this.ws.on("error", this.error.bind(this));
  }
  newRequestId() {
    return ulid();
  }
  open() {
    this.connected = true;
  }
  error(data) {
    console.log("error: ", data);
  }
  message(data) {
    try {
      const resp = new Rpc.Response();
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
import { _ns_0 } from "@dev/glued";
import { _ns_1 } from "@dev/glued";
var Client2 = class extends Client {
  constructor(remote) {
    super(remote);
  }
  async kvget(p) {
    const ret = new _ns_1.Kv();
    const resp = (await this.request(new _ns_0.Request({
      namespace: 1,
      service: 0,
      method: 0,
      params: p._marshalFields()
    }))).result;
    ret._unmarshalFields(resp);
    return ret;
  }
  async kvset(p) {
    const ret = new _ns_1.Kv();
    const resp = (await this.request(new _ns_0.Request({
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
import { _ns_0 as _ns_02 } from "@dev/glued";
import { _ns_1 as _ns_12 } from "@dev/glued";
var Client3 = class extends Client {
  constructor(remote) {
    super(remote);
  }
  async test(p) {
    const ret = new _ns_12.Kv();
    const resp = (await this.request(new _ns_02.Request({
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
export {
  __exports4 as Core,
  __exports2 as Hostd,
  __exports5 as Lang,
  __exports3 as Netcop,
  __exports as Rpc,
  __exports as _ns_0,
  __exports2 as _ns_1,
  __exports3 as _ns_10,
  __exports5 as _ns_100,
  __exports4 as _ns_75
};
