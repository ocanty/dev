
import { Rpc } from "@dev/glued"
import { RawData, WebSocket, WebSocketServer } from "ws"

export class Server {
    private wss: WebSocketServer

    constructor(
        private readonly host: string,
        private port: number,
        private readonly methods: Record<string, Record<string, Record<string, (p: object) => Promise<object>>>>
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
            const req = new Rpc.Request()
            req._unmarshal(data.toString())

            if (!(req.namespace in this.methods) || !(req.service in this.methods[req.namespace])) {
                ws.send(new Rpc.Response({
                    id: req.id,
                    result: {
                        error: {
                            code: -1,
                            message: `Service ${req.namespace}/${req.service} not available`
                        }
                    }
                })._marshal())
                return
            }

            if (!(req.method in this.methods[req.namespace][req.service])) {
                // Method does not exist in interface
                ws.send(new Rpc.Response({
                    id: req.id,
                    result: {
                        error: {
                            code: -1,
                            message: `Method ${req.method} on service ${req.service} not available`
                        }
                    }
                })._marshal())
                return
            }

            const resp = new Rpc.Response({
                id: req.id,
                result: {
                    ok: await this.methods[req.namespace][req.service][req.method](req.params),
                }
            })

            ws.send(resp._marshal())
        } catch (e) {
            console.log("unhandled exception: ", e)
        }
    }
}

