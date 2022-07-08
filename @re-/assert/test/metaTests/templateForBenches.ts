import { bench } from "../../src/index.js"

//median
bench("bench call single stat", () => {
    return "boofoozoo".includes("foo")
}).median()

//mean
bench("bench call single stat", () => {
    return "boofoozoo".includes("foo")
}).mean()

//mark
bench("bench call mark", () => {
    return /.*foo.*/.test("boofoozoo")
}).mark()
