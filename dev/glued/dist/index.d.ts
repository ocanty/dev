declare class Model {
    private readonly _type;
    private readonly _fieldTool;
    constructor(_type: string, _fieldTool: FieldToolModel, o?: any);
    _copy(): Model;
    _unmarshal(d: string): void;
    _marshal(): string;
    _marshalFields(): object;
    _unmarshalFields(o: object): void;
    _repr(n?: number | undefined): string;
    _validate(): boolean;
}
declare type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
declare type Nullable<T> = T | undefined;
declare abstract class FieldTool {
    isMarshaled(val: any): [boolean, any];
    abstract isUnmarshaled(val: any): [boolean, any];
    marshal(unmarshaled: any, onto: any, key: string): boolean;
    unmarshal(marshaled: any, onto: any, key: string): boolean;
    make(val: any): any;
    copy(val: any): any;
    repr(val: any): any;
    default(): any;
    init(onto: any, key: string, props?: any, initial?: any): void;
}
declare type FieldToolDeferred = () => FieldTool;
declare class FieldToolModel extends FieldTool {
    blank: (o?: object) => Model;
    constructor(blank: (o?: object) => Model);
    fieldMap: Record<string, [string, FieldToolDeferred]>;
    field(id: string, name: string, tool: FieldToolDeferred): FieldToolModel;
    init(onto: any, key: string, props?: any, initial?: any): void;
    isMarshaled(obj: any): [boolean, any];
    isUnmarshaled(model: object): [boolean, object];
    marshal(unmarshaled: any, onto: any, key: string): boolean;
    default(): Model;
    unmarshal(marshaled: any, onto: any, key: string): boolean;
    copy(val: any): Model;
}

interface _Request {
    version: number;
    id: string;
    namespace: number;
    service: number;
    method: number;
    params: any;
}
declare class Request extends Model implements _Request {
    constructor(o?: DeepPartial<_Request>);
    version: number;
    id: string;
    namespace: number;
    service: number;
    method: number;
    params: any;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_0$4: typeof Request;
interface _Response {
    version: number;
    id: string;
    result: _Result;
}
declare class Response extends Model implements _Response {
    constructor(o?: DeepPartial<_Response>);
    version: number;
    id: string;
    result: Result;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_1$3: typeof Response;
interface _Error {
    code: number;
    message: string;
}
declare class Error extends Model implements _Error {
    constructor(o?: DeepPartial<_Error>);
    code: number;
    message: string;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_2$2: typeof Error;
interface _Result {
    error: Nullable<_Error>;
    ok: Nullable<any>;
}
declare class Result extends Model implements _Result {
    constructor(o?: DeepPartial<_Result>);
    error: Nullable<Error>;
    ok: Nullable<any>;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
    static Error(p: _Error): Result;
    static Ok(p: any): Result;
}
declare const _model_3$1: typeof Result;

type _0_Request = Request;
declare const _0_Request: typeof Request;
type _0_Response = Response;
declare const _0_Response: typeof Response;
type _0_Error = Error;
declare const _0_Error: typeof Error;
type _0_Result = Result;
declare const _0_Result: typeof Result;
declare namespace _0 {
  export {
    _0_Request as Request,
    _model_0$4 as _model_0,
    _0_Response as Response,
    _model_1$3 as _model_1,
    _0_Error as Error,
    _model_2$2 as _model_2,
    _0_Result as Result,
    _model_3$1 as _model_3,
  };
}

interface _Config$1 {
    consul: string;
}
declare class Config$1 extends Model implements _Config$1 {
    constructor(o?: DeepPartial<_Config$1>);
    consul: string;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_0$3: typeof Config$1;
interface _K {
    k: string;
}
declare class K extends Model implements _K {
    constructor(o?: DeepPartial<_K>);
    k: string;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_1$2: typeof K;
interface _Kv {
    key: string;
    value: string;
}
declare class Kv extends Model implements _Kv {
    constructor(o?: DeepPartial<_Kv>);
    key: string;
    value: string;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_2$1: typeof Kv;
interface SvcHostd {
    kvget(p: K): Promise<Kv>;
    kvset(p: Kv): Promise<Kv>;
}
declare type _svc_0$1 = SvcHostd;

type _1_K = K;
declare const _1_K: typeof K;
type _1_Kv = Kv;
declare const _1_Kv: typeof Kv;
type _1_SvcHostd = SvcHostd;
declare namespace _1 {
  export {
    Config$1 as Config,
    _model_0$3 as _model_0,
    _1_K as K,
    _model_1$2 as _model_1,
    _1_Kv as Kv,
    _model_2$1 as _model_2,
    _1_SvcHostd as SvcHostd,
    _svc_0$1 as _svc_0,
  };
}

interface _Config {
}
declare class Config extends Model implements _Config {
    constructor(o?: DeepPartial<_Config>);
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_0$2: typeof Config;
interface SvcSrv {
    test(p: K): Promise<Kv>;
}
declare type _svc_0 = SvcSrv;

type _10_Config = Config;
declare const _10_Config: typeof Config;
type _10_SvcSrv = SvcSrv;
type _10__svc_0 = _svc_0;
declare namespace _10 {
  export {
    _10_Config as Config,
    _model_0$2 as _model_0,
    _10_SvcSrv as SvcSrv,
    _10__svc_0 as _svc_0,
  };
}

interface _Acct {
    id: string;
}
declare class Acct extends Model implements _Acct {
    constructor(o?: DeepPartial<_Acct>);
    id: string;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_0$1: typeof Acct;
interface _AcctHead {
    name: string;
}
declare class AcctHead extends Model implements _AcctHead {
    constructor(o?: DeepPartial<_AcctHead>);
    name: string;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_1$1: typeof AcctHead;

type _75_Acct = Acct;
declare const _75_Acct: typeof Acct;
type _75_AcctHead = AcctHead;
declare const _75_AcctHead: typeof AcctHead;
declare namespace _75 {
  export {
    _75_Acct as Acct,
    _model_0$1 as _model_0,
    _75_AcctHead as AcctHead,
    _model_1$1 as _model_1,
  };
}

interface _Proj {
    id: string;
    acctId: string;
}
declare class Proj extends Model implements _Proj {
    constructor(o?: DeepPartial<_Proj>);
    id: string;
    acctId: string;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_0: typeof Proj;
interface _ProjHead {
    name: string;
}
declare class ProjHead extends Model implements _ProjHead {
    constructor(o?: DeepPartial<_ProjHead>);
    name: string;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_1: typeof ProjHead;
interface _Func {
    id: string;
    projId: string;
}
declare class Func extends Model implements _Func {
    constructor(o?: DeepPartial<_Func>);
    id: string;
    projId: string;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
}
declare const _model_2: typeof Func;
interface _Test {
    ok: Nullable<string>;
}
declare class Test extends Model implements _Test {
    constructor(o?: DeepPartial<_Test>);
    ok: Nullable<string>;
    static fieldTool: {
        blank: (o?: object | undefined) => Model;
        fieldMap: Record<string, [string, FieldToolDeferred]>;
        field(id: string, name: string, tool: FieldToolDeferred): any;
        init(onto: any, key: string, props?: any, initial?: any): void;
        isMarshaled(obj: any): [boolean, any];
        isUnmarshaled(model: object): [boolean, object];
        marshal(unmarshaled: any, onto: any, key: string): boolean;
        default(): Model;
        unmarshal(marshaled: any, onto: any, key: string): boolean;
        copy(val: any): Model;
        make(val: any): any;
        repr(val: any): any;
    };
    static Ok(p: string): Test;
}
declare const _model_3: typeof Test;

type _100_Proj = Proj;
declare const _100_Proj: typeof Proj;
declare const _100__model_0: typeof _model_0;
type _100_ProjHead = ProjHead;
declare const _100_ProjHead: typeof ProjHead;
declare const _100__model_1: typeof _model_1;
type _100_Func = Func;
declare const _100_Func: typeof Func;
declare const _100__model_2: typeof _model_2;
type _100_Test = Test;
declare const _100_Test: typeof Test;
declare const _100__model_3: typeof _model_3;
declare namespace _100 {
  export {
    _100_Proj as Proj,
    _100__model_0 as _model_0,
    _100_ProjHead as ProjHead,
    _100__model_1 as _model_1,
    _100_Func as Func,
    _100__model_2 as _model_2,
    _100_Test as Test,
    _100__model_3 as _model_3,
  };
}

export { _75 as Core, _1 as Hostd, _100 as Lang, Model, _10 as Netcop, _0 as Rpc, _0 as _ns_0, _1 as _ns_1, _10 as _ns_10, _100 as _ns_100, _75 as _ns_75 };
