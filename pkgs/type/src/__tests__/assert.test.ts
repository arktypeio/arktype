import { assert } from "@re-do/assert"

beforeAll(() => {
    /**
     * This will fully parse all of this package's types
     * in preparation for the imported tests. The amount of time
     * it takes to do so is a heuristic for the performance
     * of those types.
     */
    const startTime = Date.now()
    console.log("Analyzing types...")
    assert(true).typed as true
    console.log(
        `Finished analyzing types in ${
            (Date.now() - startTime) / 1000
        } seconds⏱️`
    )
})

import "./compile.assert.js"
import "./declare.assert.js"
import "./parse.assert.js"
import "./references.assert.js"
import "./multifile.assert.js"
