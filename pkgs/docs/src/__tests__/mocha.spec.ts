import { getTests, run } from "@re-do/test"

describe("tests run with mocha", () => {
    const tests = getTests()
    tests.forEach(({ id, name }) => {
        it(name, async () => {
            await run({ id })
        })
    })
})
