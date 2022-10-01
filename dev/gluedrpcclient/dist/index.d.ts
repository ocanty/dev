import { Rpc, _ns_1, _ns_10 } from '@dev/glued';

declare namespace _0 {
  export {
  };
}

declare class Client$2 {
    private readonly remote;
    private ws;
    private connected;
    private pending;
    constructor(remote: string);
    protected newRequestId(): string;
    private open;
    private error;
    private message;
    private close;
    protected request(r: Rpc.Request): Promise<Rpc.Response>;
}

declare class Client$1 extends Client$2 implements _ns_1._svc_0 {
    constructor(remote: string);
    kvget(p: _ns_1.K): Promise<_ns_1.Kv>;
    kvset(p: _ns_1.Kv): Promise<_ns_1.Kv>;
}

declare namespace _1 {
  export {
    Client$1 as Client,
  };
}

declare class Client extends Client$2 implements _ns_10._svc_0 {
    constructor(remote: string);
    test(p: _ns_1.K): Promise<_ns_1.Kv>;
}

type _10_Client = Client;
declare const _10_Client: typeof Client;
declare namespace _10 {
  export {
    _10_Client as Client,
  };
}

declare namespace _75 {
  export {
  };
}

declare namespace _100 {
  export {
  };
}

export { _75 as Core, _1 as Hostd, _100 as Lang, _10 as Netcop, _0 as Rpc, _0 as _ns_0, _1 as _ns_1, _10 as _ns_10, _100 as _ns_100, _75 as _ns_75 };
