
export {}
import * as _M from "../model"
import * as _ns_0 from "./0"
interface _Proj {
	id: string
	acctId: string
}

export class Proj extends _M.Model implements _Proj {
	constructor(o?: _M.DeepPartial<_Proj>) {
		super("100/0", Proj.fieldTool, o)
	}
	id!: string
	acctId!: string
	static fieldTool = _M.FieldTools.model(() => new Proj())
		.field("0", "id", () => _M.FieldTools.str)
		.field("1", "acctId", () => _M.FieldTools.str)
}

export const _model_0 = Proj

interface _ProjHead {
	name: string
}

export class ProjHead extends _M.Model implements _ProjHead {
	constructor(o?: _M.DeepPartial<_ProjHead>) {
		super("100/1", ProjHead.fieldTool, o)
	}
	name!: string
	static fieldTool = _M.FieldTools.model(() => new ProjHead())
		.field("0", "name", () => _M.FieldTools.str)
}

export const _model_1 = ProjHead

interface _Func {
	id: string
	projId: string
}

export class Func extends _M.Model implements _Func {
	constructor(o?: _M.DeepPartial<_Func>) {
		super("100/2", Func.fieldTool, o)
	}
	id!: string
	projId!: string
	static fieldTool = _M.FieldTools.model(() => new Func())
		.field("0", "id", () => _M.FieldTools.str)
		.field("1", "projId", () => _M.FieldTools.str)
}

export const _model_2 = Func

interface _Test {
	ok: _M.Nullable<string>
}

export class Test extends _M.Model implements _Test {
	constructor(o?: _M.DeepPartial<_Test>) {
		super("100/3", Test.fieldTool, o)
	}
	ok!: _M.Nullable<string>
	static fieldTool = _M.FieldTools.model(() => new Test())
		.field("0", "ok", () => _M.FieldTools.nullable(() => _M.FieldTools.str))
	static Ok(p: string) {
		return new Test({ ok: p })
	}
}

export const _model_3 = Test