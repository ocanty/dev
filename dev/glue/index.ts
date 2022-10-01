import { ID as Id, Int32, PII, Spec, Str, Types } from "./lib";

(async () => {
    await Spec()
        .namespace(1, "hostd")
            .types()
                .model(0, "config")
                    .field(0, "consul", Str())
                .model(1, "k")
                    .field(0, "k", Str())
                .model(2, "kv")
                    .field(0, "key", Str())
                    .field(1, "value", Str())

            .services()
                .service(0, "hostd", {
                    config: Types("hostd/config")
                })
                    .method(0, "kvget", Types("hostd/k"), Types("hostd/kv"))
                    .method(1, "kvset", Types("hostd/kv"), Types("hostd/kv"))

        .namespace(10, "netcop")
            .files("./files/netcop")
            .types()
                .model(0, "config")

            .services()
                .service(0, "srv", {
                    config: Types("netcop/config")
                })
                    .method(0, "test", Types("hostd/k"), Types("hostd/kv"))

        .namespace(100, "api")
            .types()
                .model(0, "none")
                .model(1, "ok")
                    .field(0, "message", Str())
                .model(2, "error")
                    .field(0, "message", Str())
                    .field(0, "code", Int32())
                .enum(3, "test")
                    .value(0, "ok", Str())

        .namespace(75, "core")
            .types()
                .model(0, "acct")
                    .db()
                    .field(0, "id",     Id("acct", { type: "primary"}))
                    // .field(1, "head",   Types("core/acctHead"))

                .model(1, "acctHead")
                    .field(0, "name",   Str({ pii: PII.ANY_PII }))

        .namespace(100, "lang")
            .types()
                .model(0, "proj")
                    .db()
                    .field(0, "id",     Id("proj", { type: "primary" }))
                    .field(1, "acctId", Id("acct", { type: "rel", rel: Types("core/acct") }))
                    // .field(2, "head",   Types("lang/projHead"))
                    
                .model(1, "projHead")
                    .field(0, "name", Str())

                .model(2, "func")
                    .field(0, "id",     Id("func", { type: "primary"}))
                    .field(1, "projId", Id("proj", { type: "rel", rel: Types("lang/proj") }))
        


        .build("../")
})()