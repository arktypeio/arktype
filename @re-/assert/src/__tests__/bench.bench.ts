import { bench } from "../index.js"

bench("includes", () => {
    return "boofoozoo".includes("foo")
}).median("1.0ns")

bench("includes", () => {
    return "boofoozoo".includes("foo")
}).mark({ mean: "61.7ns", median: "48.0ns" })

bench("regex", () => {
    return /.*foo.*/.test("boofoozoo")
}).mean("74.4ns")

bench("regex", () => {
    return /.*foo.*/.test("boofoozoo")
}).mark({ mean: "1.7ns", median: "62.0ns" })
