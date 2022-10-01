
export {}
import * as _M from "../model"
import * as _ns_0 from "./0"
interface _Config {
	consul: string
}

export class Config extends _M.Model implements _Config {
	constructor(o?: _M.DeepPartial<_Config>) {
		super("1/0", Config.fieldTool, o)
	}
	consul!: string
	static fieldTool = _M.FieldTools.model(() => new Config())
		.field("0", "consul", () => _M.FieldTools.str)
}

export const _model_0 = Config

interface _K {
	k: string
}

export class K extends _M.Model implements _K {
	constructor(o?: _M.DeepPartial<_K>) {
		super("1/1", K.fieldTool, o)
	}
	k!: string
	static fieldTool = _M.FieldTools.model(() => new K())
		.field("0", "k", () => _M.FieldTools.str)
}

export const _model_1 = K

interface _Kv {
	key: string
	value: string
}

export class Kv extends _M.Model implements _Kv {
	constructor(o?: _M.DeepPartial<_Kv>) {
		super("1/2", Kv.fieldTool, o)
	}
	key!: string
	value!: string
	static fieldTool = _M.FieldTools.model(() => new Kv())
		.field("0", "key", () => _M.FieldTools.str)
		.field("1", "value", () => _M.FieldTools.str)
}

export const _model_2 = Kv

export interface SvcHostd {
	kvget(p: K): Promise<Kv>
	kvset(p: Kv): Promise<Kv>
}

export type _svc_0 = SvcHostd