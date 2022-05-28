import { bench } from "../bench.js"

bench("regex", () => {
    return /.*foo.*/.test("boofoozoo")
}).mean("0.0000699ms")

bench("includes", () => {
    return "boofoozoo".includes("foo")
}).mean("0.0000671ms")
