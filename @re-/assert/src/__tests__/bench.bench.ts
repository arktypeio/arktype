import { bench } from "../bench.js"

bench("regex", () => {
    ;/.*foo.*/.test("boofoozoo")
}).mark(0.0000729)

bench("includes", () => {
    return "boofoozoo".includes("foo")
}).mark(0.0000631)
