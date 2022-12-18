
import * as process from "process";
import { Spec } from "./gen.js";

(async () => {
    if (process.argv.length !== 3) {
        throw new Error("missing build directory")
    }

    await Spec().build(process.argv[2])
})()