
import { Rpc } from "@dev/glued"
import Websocket from "isomorphic-ws"
import { ulid } from "ulid"

export class Client {
    private ws: Websocket
    private connected: boolean = false

    private pending: Record<string, [(r: Rpc.Response) => void, (e: Error) => void]> = {}

    constructor(
        private readonly remote: string
    ) {
        this.ws = new Websocket(
            `wss://${remote}`
        )

        this.ws.on("open", this.open.bind(this))
        this.ws.on("message", this.message.bind(this))
        this.ws.on("close", this.close.bind(this))
        this.ws.on("error", this.error.bind(this))
    }

    protected newRequestId(): string {
        return ulid()
    }

    private open() {
        this.connected = true
    }

    private error(data) {
        console.log("error: ", data)
    }

    private message(data) {
        try {
            const resp = new Rpc.Response()
            resp._unmarshal(data)

            if (resp.id in this.pending) {
                const resolve = this.pending[resp.id][0]
                const reject = this.pending[resp.id][1]

                delete this.pending[resp.id]

                if (resp.result.error) {
                    reject(new Error(`${resp.result.error.code}: ${resp.result.error.message}`))
                } else if (resp.result.ok) {
                    resolve(resp)
                }
            } else {
                console.log("Unhandled message: ", resp)
            }

        } catch (e) {
            console.log("unhandled error: ", e)
        }
    }

    private close() {
        this.connected = false
    }

    protected async request(r: Rpc.Request): Promise<Rpc.Response> {
        return new Promise((resolve, reject) => {
            if (r.id in this.pending) {
                console.log("tried to resend request, ", r.id)
            } else {
                this.ws.send(r._marshal())
                this.pending[r.id] = [resolve, reject]
            }
        })
    }
}

