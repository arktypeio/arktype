import { bench } from "../../src/index.js"

//median
bench(
    "bench call single stat",
    () => {
        return "boofoozoo".includes("foo")
    },
    { until: { count: 2 } }
).median()

//mean
bench(
    "bench call single stat",
    () => {
        return "boofoozoo".includes("foo")
    },
    { until: { count: 2 } }
).mean()

//mark
bench(
    "bench call mark",
    () => {
        return /.*foo.*/.test("boofoozoo")
    },
    { until: { count: 2 } }
).mark()
