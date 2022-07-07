import { bench } from "../../src/index.js"

// prettier-ignore
const metaBenchTests = () => {
    //bench1
    bench("bench call single stat", () => {
        return "boofoozoo".includes("foo")
    }).median(`79.99ns`)

    //bench2
    bench("bench call single stat", () => {
        return "boofoozoo".includes("foo")
    }).mean(`116.71ns`)

    //bench3
    bench("bench call mark", () => {
        return /.*foo.*/.test("boofoozoo")
    }).mark({mean: `161.27ns`, median: `139.12ns`})

    //bench4
    bench("bench call mark", () => {
        return /.*foo.*/.test("boofoozoo")
    }).median(`121.42us`)
}
metaBenchTests()
