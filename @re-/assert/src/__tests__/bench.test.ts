import { assert } from "../assert.js"
import { bench } from "../value/bench.js"

describe("bench", () => {
    it("async", async () => {
        assert(
            await bench(() => {
                "re".repeat(99999)
            })
        ).snap(0.00038440378140096196)
    }).timeout(6000)
})
