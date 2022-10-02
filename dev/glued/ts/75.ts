/* eslint-disable */
/* This file has been automatically generated */
export {}
import * as _M from "../model"
import * as _ns_0 from "./0"
interface _Acct {
	id: string
}

export class Acct extends _M.Model implements _Acct {
	constructor(o?: _M.DeepPartial<_Acct>) {
		super("75/0", Acct.fieldTool, o)
	}
	id!: string
	static fieldTool = _M.FieldTools.model(() => new Acct())
		.field("0", "id", () => _M.FieldTools.str)
}

export const _model_0 = Acct

interface _AcctHead {
	name: string
}

export class AcctHead extends _M.Model implements _AcctHead {
	constructor(o?: _M.DeepPartial<_AcctHead>) {
		super("75/1", AcctHead.fieldTool, o)
	}
	name!: string
	static fieldTool = _M.FieldTools.model(() => new AcctHead())
		.field("0", "name", () => _M.FieldTools.str)
}

export const _model_1 = AcctHead
