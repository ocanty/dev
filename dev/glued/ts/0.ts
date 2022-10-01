
export {}
import * as _M from "../model"
interface _Request {
	version: number
	id: string
	namespace: number
	service: number
	method: number
	params: any
}

export class Request extends _M.Model implements _Request {
	constructor(o?: _M.DeepPartial<_Request>) {
		super("0/0", Request.fieldTool, o)
	}
	version!: number
	id!: string
	namespace!: number
	service!: number
	method!: number
	params!: any
	static fieldTool = _M.FieldTools.model(() => new Request())
		.field("0", "version", () => _M.FieldTools.int32)
		.field("1", "id", () => _M.FieldTools.str)
		.field("2", "namespace", () => _M.FieldTools.int32)
		.field("3", "service", () => _M.FieldTools.int32)
		.field("4", "method", () => _M.FieldTools.int32)
		.field("5", "params", () => _M.FieldTools.any)
}

export const _model_0 = Request

interface _Response {
	version: number
	id: string
	result: _Result
}

export class Response extends _M.Model implements _Response {
	constructor(o?: _M.DeepPartial<_Response>) {
		super("0/1", Response.fieldTool, o)
	}
	version!: number
	id!: string
	result!: Result
	static fieldTool = _M.FieldTools.model(() => new Response())
		.field("0", "version", () => _M.FieldTools.int32)
		.field("1", "id", () => _M.FieldTools.str)
		.field("2", "result", () => Result.fieldTool)
}

export const _model_1 = Response

interface _Error {
	code: number
	message: string
}

export class Error extends _M.Model implements _Error {
	constructor(o?: _M.DeepPartial<_Error>) {
		super("0/2", Error.fieldTool, o)
	}
	code!: number
	message!: string
	static fieldTool = _M.FieldTools.model(() => new Error())
		.field("0", "code", () => _M.FieldTools.int32)
		.field("1", "message", () => _M.FieldTools.str)
}

export const _model_2 = Error

interface _Result {
	error: _M.Nullable<_Error>
	ok: _M.Nullable<any>
}

export class Result extends _M.Model implements _Result {
	constructor(o?: _M.DeepPartial<_Result>) {
		super("0/3", Result.fieldTool, o)
	}
	error!: _M.Nullable<Error>
	ok!: _M.Nullable<any>
	static fieldTool = _M.FieldTools.model(() => new Result())
		.field("0", "error", () => _M.FieldTools.nullable(() => Error.fieldTool))
		.field("1", "ok", () => _M.FieldTools.nullable(() => _M.FieldTools.any))
	static Error(p: _Error) {
		return new Result({ error: p })
	}
	static Ok(p: any) {
		return new Result({ ok: p })
	}
}

export const _model_3 = Result
