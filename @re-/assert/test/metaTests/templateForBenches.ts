import { bench } from "../../src/index.js"

// prettier-ignore
const metaBenchTests = () => {
    //bench1
    bench("bench call single stat", () => {
        return "boofoozoo".includes("foo")
    }).median()

    //bench2
    bench("bench call single stat", () => {
        return "boofoozoo".includes("foo")
    }).mean()

    //bench3
    bench("bench call mark", () => {
        return /.*foo.*/.test("boofoozoo")
    }).mark()

    //bench4
    bench("bench call mark", () => {
        return /.*foo.*/.test("boofoozoo")
    }).median(`121.42us`)
}
metaBenchTests()
