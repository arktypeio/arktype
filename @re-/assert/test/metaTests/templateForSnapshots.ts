import { assert } from "../../src/assert.js"
import { cacheAssertions, cleanupAssertions } from "../../src/type/analysis.js"

const isPrecached = process.argv.includes("--reassertTestPreCached")

// prettier-ignore
const metaSnapshotTests = () => {
    // type
    assert({ re: "do" }).equals({ re: "do" }).type.toString.snap()

    //5
    assert(5).snap()

    // object
    assert({ re: `do` }).snap()

    //inlineUpdate
    // @ts-ignore (using internal updateSnapshots hook)
    assert({ re: "dew" }, { updateSnapshots: true }).snap()

    //update6To5
    // @ts-ignore (using internal updateSnapshots hook)
    assert(5, { updateSnapshots: true }).snap(6)

    //undefined
    // assert(undefined).snap()
}
isPrecached && cacheAssertions()
metaSnapshotTests()
isPrecached && cleanupAssertions()
