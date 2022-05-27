import { bench } from "../bench.js"

bench("regex", () => {
    ;/.*foo.*/.test("boofoozoo")
}).mean("0.0000760ms")

bench("includes", () => {
    return "boofoozoo".includes("foo")
}).mean("0.0000617ms")
