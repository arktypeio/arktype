import { bench } from "../bench.js"

bench("includes", () => {
    return "boofoozoo".includes("foo")
}).median("0.0000480ms")

bench("includes", () => {
    return "boofoozoo".includes("foo")
}).mark({ mean: "0.0000600ms", median: "0.0000510ms" })

bench("regex", () => {
    return /.*foo.*/.test("boofoozoo")
}).mean("0.0000746ms")

bench("regex", () => {
    return /.*foo.*/.test("boofoozoo")
}).mark({ mean: "0.0000794ms", median: "0.0000600ms" })
