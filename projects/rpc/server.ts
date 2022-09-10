
import * as Rpc from "@tree/defs/ts/rpc"
import { WebSocketServer, WebSocket, RawData } from "ws"


export class Server {
    private wss: WebSocketServer

    constructor(
        private readonly host: string,
        private port: number,
        private readonly methods: Record<number, Record<number, (p: string) => Promise<string>>>
    ) {
        this.wss = new WebSocketServer({
            host: this.host,
            port: this.port
        })
    
        this.wss.on("connection", (ws: WebSocket, req) => {
            ws.on("open", () => {

            })

            ws.on("message", (data, isBinary) => {
                if (isBinary) {
                    console.log("recieved binary.")
                    return
                }

                this.message(ws, data)
            })
        })
    }

    private async message(ws: WebSocket, data: RawData) {
        try {
            const req = new RpcRequest()._unmarshal(data.toString())

            if (!(req.service in this.methods[req.service])) {
                ws.send(new RpcResponse({
                    id: req.id,
                    error: {
                        code: -1,
                        message: `Service ${req.service} not available`
                    }
                })._marshal())
                return
            }

            if (!(req.method in this.methods[req.service])) {
                // Method does not exist in interface
                ws.send(new RpcResponse({
                    id: req.id,
                    error: {
                        code: -1,
                        message: `Method ${req.method} on service ${req.service} not available`
                    }
                })._marshal())
                return
            }

            const resp = new RpcResponse({
                id: req.id,
                return: await this.methods[req.service][req.method](req.params),
            })

            ws.send(resp._marshal())
        } catch (e) {
            console.log("unhandled exception: ", e)
        }
    }
}

