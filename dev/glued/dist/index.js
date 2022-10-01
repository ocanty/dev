"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var glued_exports = {};
__export(glued_exports, {
  Core: () => __exports4,
  Hostd: () => __exports2,
  Lang: () => __exports5,
  Model: () => Model,
  Netcop: () => __exports3,
  Rpc: () => __exports,
  _ns_0: () => __exports,
  _ns_1: () => __exports2,
  _ns_10: () => __exports3,
  _ns_100: () => __exports5,
  _ns_75: () => __exports4
});
module.exports = __toCommonJS(glued_exports);

// model.ts
var Model = class {
  constructor(_type, _fieldTool, o) {
    this._type = _type;
    this._fieldTool = _fieldTool;
    _fieldTool.init({ self: this }, "self", o, this);
  }
  _copy() {
    return this._fieldTool.copy(this);
  }
  _unmarshal(d) {
    let c = { _key: this };
    if (!this._fieldTool.unmarshal(JSON.parse(d), c, "_key")) {
      throw new Error("could not unmarshal");
    }
  }
  _marshal() {
    const ret = { _key: {} };
    if (!this._fieldTool.marshal(this, ret, "_key")) {
      throw new Error("could not marshal");
    }
    return JSON.stringify(ret._key);
  }
  _marshalFields() {
    const c = { _ret: {} };
    if (!this._fieldTool.marshal(this, c, "_ret")) {
      throw new Error("could not marshal");
    }
    return c._ret;
  }
  _unmarshalFields(o) {
    let c = { _key: this };
    if (!this._fieldTool.unmarshal(o, c, "_key")) {
      throw new Error("could not marshal");
    }
  }
  _repr(n) {
    return this._fieldTool.repr(this);
  }
  _validate() {
    return this._fieldTool.isUnmarshaled(this)[0];
  }
};
var FieldTool = class {
  isMarshaled(val) {
    return this.isUnmarshaled(val);
  }
  marshal(unmarshaled, onto, key) {
    const [valid, marshaled] = this.isUnmarshaled(unmarshaled);
    onto[key] = marshaled;
    return valid;
  }
  unmarshal(marshaled, onto, key) {
    const [valid, unmarshaled] = this.isMarshaled(marshaled);
    onto[key] = unmarshaled;
    return valid;
  }
  make(val) {
    return val;
  }
  copy(val) {
    return val;
  }
  repr(val) {
    return `${val}`;
  }
  default() {
    return void 0;
  }
  init(onto, key, props, initial) {
    onto[key] = props !== void 0 ? props : this.default();
  }
};
var FieldToolAny = class extends FieldTool {
  default() {
    return void 0;
  }
  isUnmarshaled(val) {
    return [true, val];
  }
};
var FieldToolBool = class extends FieldTool {
  default() {
    return false;
  }
  isUnmarshaled(val) {
    const valid = typeof val == "boolean";
    return [valid, valid ? val : this.default()];
  }
};
var FieldToolInt32 = class extends FieldTool {
  default() {
    return 0;
  }
  isUnmarshaled(val) {
    const valid = typeof val == "number" && val % 1 == 0 && val >= -2147483648 && val <= 2147483647;
    return [valid, valid ? val : this.default()];
  }
};
var FieldToolStr = class extends FieldTool {
  default() {
    return "";
  }
  isUnmarshaled(val) {
    const valid = typeof val == "string";
    return [valid, valid ? val : this.default()];
  }
};
var FieldToolRaw = class extends FieldTool {
  default() {
    return "{}";
  }
  isUnmarshaled(val) {
    const valid = typeof val == "string";
    return [valid, valid ? val : this.default()];
  }
};
var FieldToolArray = class extends FieldTool {
  constructor(contains) {
    super();
    this.contains = contains;
  }
  default() {
    return [];
  }
  isUnmarshaled(val) {
    if (!Array.isArray(val)) {
      return [false, this.default()];
    }
    for (const v of val) {
      const [valid, value] = this.contains().isUnmarshaled(v);
      if (!valid) {
        return [false, this.default()];
      }
    }
    return [true, val];
  }
  copy(val) {
    return val.map((v) => {
      return this.contains().copy(v);
    });
  }
};
var FieldToolDict = class extends FieldTool {
  constructor(contains) {
    super();
    this.contains = contains;
  }
  default() {
    return {};
  }
  isUnmarshaled(val) {
    if (val.constructor !== Object) {
      return [false, this.default()];
    }
    for (const [k, v] of Object.entries(val)) {
      const [valid, value] = this.contains().isUnmarshaled(v);
      if (!valid) {
        return [false, this.default()];
      }
    }
    return [true, val];
  }
  copy(p) {
    return Object.fromEntries(
      Object.entries(p).map(
        ([k, v]) => [k, this.contains().copy(v)]
      )
    );
  }
};
var FieldToolNullable = class extends FieldTool {
  constructor(contains) {
    super();
    this.contains = contains;
  }
  default() {
    return void 0;
  }
  marshal(unmarshaled, onto, key) {
    if (typeof unmarshaled === "undefined") {
      onto[key] = void 0;
      return true;
    }
    return this.contains().marshal(unmarshaled, onto, key);
  }
  unmarshal(marshaled, onto, key) {
    if (typeof marshaled === "undefined") {
      onto[key] = void 0;
      return true;
    }
    return this.contains().unmarshal(marshaled, onto, key);
  }
  isUnmarshaled(marshaled) {
    if (typeof marshaled === "undefined") {
      return [true, marshaled];
    }
    const [valid, value] = this.contains().isUnmarshaled(marshaled);
    if (!valid) {
      return [false, this.default()];
    }
    return [true, value];
  }
  copy(p) {
    if (typeof p === "undefined") {
      return void 0;
    }
    return this.contains().copy(p);
  }
};
var FieldToolModel = class extends FieldTool {
  constructor(blank) {
    super();
    this.blank = blank;
    this.fieldMap = {};
  }
  field(id, name, tool) {
    this.fieldMap[id] = [name, tool];
    return this;
  }
  init(onto, key, props, initial) {
    const ret = initial || this.blank();
    let initProps = props == void 0 || props.constructor != Object ? {} : props;
    for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldMap)) {
      if (fieldName in initProps) {
        tool().init(ret, fieldName, initProps[fieldName]);
      } else {
        tool().init(ret, fieldName);
      }
    }
  }
  isMarshaled(obj) {
    if (obj.constructor != Object) {
      return [false, {}];
    }
    let valid = true;
    for (const [fieldId, [_, tool]] of Object.entries(this.fieldMap)) {
      if (fieldId in obj) {
        const [fValid, _2] = tool().isMarshaled(obj[fieldId]);
        valid && (valid = fValid);
      }
    }
    return [valid, obj];
  }
  isUnmarshaled(model) {
    if (model instanceof Model) {
      return [true, model];
    }
    return [false, this.default()];
  }
  marshal(unmarshaled, onto, key) {
    let valid = true;
    onto[key] = {};
    for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldMap)) {
      if (unmarshaled !== void 0 && fieldName in unmarshaled) {
        let fValid = tool().marshal(unmarshaled[fieldName], onto[key], fieldId);
        valid && (valid = fValid);
      } else {
        tool().marshal(void 0, onto[key], fieldId);
      }
    }
    return valid;
  }
  default() {
    return this.blank();
  }
  unmarshal(marshaled, onto, key) {
    let valid = true;
    onto[key] = this.default();
    console.log("unmarshaling onto", onto, key);
    for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldMap)) {
      if (marshaled !== void 0 && fieldId in marshaled) {
        console.log("marshaled[fieldId]", marshaled[fieldId], fieldName);
        let fValid = tool().unmarshal(marshaled[fieldId], onto[key], fieldName);
        console.log("field valid? ", fieldId, fieldName, fValid);
        valid && (valid = fValid);
      } else {
        tool().unmarshal(void 0, onto[key], fieldName);
      }
    }
    return valid;
  }
  copy(val) {
    let ret = this.default();
    for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldMap)) {
      if (fieldName in val) {
        ret[fieldName] = tool().copy(val[fieldName]);
      }
    }
    return ret;
  }
};
var FieldTools = class {
  static indent(s, n) {
    return "	".repeat(n) + s;
  }
  static array(contains) {
    return new FieldToolArray(contains);
  }
  static dict(contains) {
    return new FieldToolDict(contains);
  }
  static nullable(contains) {
    return new FieldToolNullable(contains);
  }
  static model(construct) {
    return new FieldToolModel(construct);
  }
};
FieldTools.bool = new FieldToolBool();
FieldTools.int32 = new FieldToolInt32();
FieldTools.raw = new FieldToolRaw();
FieldTools.str = new FieldToolStr();
FieldTools.any = new FieldToolAny();

// ts/0.ts
var __exports = {};
__export(__exports, {
  Error: () => Error2,
  Request: () => Request,
  Response: () => Response,
  Result: () => Result,
  _model_0: () => _model_0,
  _model_1: () => _model_1,
  _model_2: () => _model_2,
  _model_3: () => _model_3
});
var _Request = class extends Model {
  constructor(o) {
    super("0/0", _Request.fieldTool, o);
  }
};
var Request = _Request;
Request.fieldTool = FieldTools.model(() => new _Request()).field("0", "version", () => FieldTools.int32).field("1", "id", () => FieldTools.str).field("2", "namespace", () => FieldTools.int32).field("3", "service", () => FieldTools.int32).field("4", "method", () => FieldTools.int32).field("5", "params", () => FieldTools.any);
var _model_0 = Request;
var _Response = class extends Model {
  constructor(o) {
    super("0/1", _Response.fieldTool, o);
  }
};
var Response = _Response;
Response.fieldTool = FieldTools.model(() => new _Response()).field("0", "version", () => FieldTools.int32).field("1", "id", () => FieldTools.str).field("2", "result", () => Result.fieldTool);
var _model_1 = Response;
var _Error = class extends Model {
  constructor(o) {
    super("0/2", _Error.fieldTool, o);
  }
};
var Error2 = _Error;
Error2.fieldTool = FieldTools.model(() => new _Error()).field("0", "code", () => FieldTools.int32).field("1", "message", () => FieldTools.str);
var _model_2 = Error2;
var _Result = class extends Model {
  constructor(o) {
    super("0/3", _Result.fieldTool, o);
  }
  static Error(p) {
    return new _Result({ error: p });
  }
  static Ok(p) {
    return new _Result({ ok: p });
  }
};
var Result = _Result;
Result.fieldTool = FieldTools.model(() => new _Result()).field("0", "error", () => FieldTools.nullable(() => Error2.fieldTool)).field("1", "ok", () => FieldTools.nullable(() => FieldTools.any));
var _model_3 = Result;

// ts/1.ts
var __exports2 = {};
__export(__exports2, {
  Config: () => Config,
  K: () => K,
  Kv: () => Kv,
  _model_0: () => _model_02,
  _model_1: () => _model_12,
  _model_2: () => _model_22
});
var _Config = class extends Model {
  constructor(o) {
    super("1/0", _Config.fieldTool, o);
  }
};
var Config = _Config;
Config.fieldTool = FieldTools.model(() => new _Config()).field("0", "consul", () => FieldTools.str);
var _model_02 = Config;
var _K = class extends Model {
  constructor(o) {
    super("1/1", _K.fieldTool, o);
  }
};
var K = _K;
K.fieldTool = FieldTools.model(() => new _K()).field("0", "k", () => FieldTools.str);
var _model_12 = K;
var _Kv = class extends Model {
  constructor(o) {
    super("1/2", _Kv.fieldTool, o);
  }
};
var Kv = _Kv;
Kv.fieldTool = FieldTools.model(() => new _Kv()).field("0", "key", () => FieldTools.str).field("1", "value", () => FieldTools.str);
var _model_22 = Kv;

// ts/10.ts
var __exports3 = {};
__export(__exports3, {
  Config: () => Config2,
  _model_0: () => _model_03
});
var _Config2 = class extends Model {
  constructor(o) {
    super("10/0", _Config2.fieldTool, o);
  }
};
var Config2 = _Config2;
Config2.fieldTool = FieldTools.model(() => new _Config2());
var _model_03 = Config2;

// ts/75.ts
var __exports4 = {};
__export(__exports4, {
  Acct: () => Acct,
  AcctHead: () => AcctHead,
  _model_0: () => _model_04,
  _model_1: () => _model_13
});
var _Acct = class extends Model {
  constructor(o) {
    super("75/0", _Acct.fieldTool, o);
  }
};
var Acct = _Acct;
Acct.fieldTool = FieldTools.model(() => new _Acct()).field("0", "id", () => FieldTools.str);
var _model_04 = Acct;
var _AcctHead = class extends Model {
  constructor(o) {
    super("75/1", _AcctHead.fieldTool, o);
  }
};
var AcctHead = _AcctHead;
AcctHead.fieldTool = FieldTools.model(() => new _AcctHead()).field("0", "name", () => FieldTools.str);
var _model_13 = AcctHead;

// ts/100.ts
var __exports5 = {};
__export(__exports5, {
  Func: () => Func,
  Proj: () => Proj,
  ProjHead: () => ProjHead,
  Test: () => Test,
  _model_0: () => _model_05,
  _model_1: () => _model_14,
  _model_2: () => _model_23,
  _model_3: () => _model_32
});
var _Proj = class extends Model {
  constructor(o) {
    super("100/0", _Proj.fieldTool, o);
  }
};
var Proj = _Proj;
Proj.fieldTool = FieldTools.model(() => new _Proj()).field("0", "id", () => FieldTools.str).field("1", "acctId", () => FieldTools.str);
var _model_05 = Proj;
var _ProjHead = class extends Model {
  constructor(o) {
    super("100/1", _ProjHead.fieldTool, o);
  }
};
var ProjHead = _ProjHead;
ProjHead.fieldTool = FieldTools.model(() => new _ProjHead()).field("0", "name", () => FieldTools.str);
var _model_14 = ProjHead;
var _Func = class extends Model {
  constructor(o) {
    super("100/2", _Func.fieldTool, o);
  }
};
var Func = _Func;
Func.fieldTool = FieldTools.model(() => new _Func()).field("0", "id", () => FieldTools.str).field("1", "projId", () => FieldTools.str);
var _model_23 = Func;
var _Test = class extends Model {
  constructor(o) {
    super("100/3", _Test.fieldTool, o);
  }
  static Ok(p) {
    return new _Test({ ok: p });
  }
};
var Test = _Test;
Test.fieldTool = FieldTools.model(() => new _Test()).field("0", "ok", () => FieldTools.nullable(() => FieldTools.str));
var _model_32 = Test;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Core,
  Hostd,
  Lang,
  Model,
  Netcop,
  Rpc,
  _ns_0,
  _ns_1,
  _ns_10,
  _ns_100,
  _ns_75
});
