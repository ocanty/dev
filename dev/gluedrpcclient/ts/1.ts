
export {}
import { Client as BaseClient } from "../client"
import { _ns_0 } from "@dev/glued"
import { _ns_1 } from "@dev/glued"
export class Client extends BaseClient implements _ns_1._svc_0 {
	constructor(remote: string) {
		super(remote)
	}
	async kvget(p: _ns_1.K): Promise<_ns_1.Kv> {
		const ret = new _ns_1.Kv()
		const resp = (await this.request(new _ns_0.Request({
			namespace: 1, service: 0, method: 0,
			params: p._marshalFields()
		}))).result
		
		ret._unmarshalFields(resp)
		
		return ret
	}
	async kvset(p: _ns_1.Kv): Promise<_ns_1.Kv> {
		const ret = new _ns_1.Kv()
		const resp = (await this.request(new _ns_0.Request({
			namespace: 1, service: 0, method: 1,
			params: p._marshalFields()
		}))).result
		
		ret._unmarshalFields(resp)
		
		return ret
	}
}