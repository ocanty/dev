
export {}
import * as _M from "../model"
import * as _ns_0 from "./0"
import * as _ns_1 from "./1"
interface _Config {
}

export class Config extends _M.Model implements _Config {
	constructor(o?: _M.DeepPartial<_Config>) {
		super("10/0", Config.fieldTool, o)
	}
	static fieldTool = _M.FieldTools.model(() => new Config())
}

export const _model_0 = Config

export interface SvcSrv {
	test(p: _ns_1.K): Promise<_ns_1.Kv>
}

export type _svc_0 = SvcSrv