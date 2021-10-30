import { fromHere, tsc } from ".."

describe("tsc", () => {
    test("compiles directory", () => {
        // tsc(fromHere("..", "..", "..", "retypes", "src"))
        tsc(fromHere("ts-project"))
    })
})
