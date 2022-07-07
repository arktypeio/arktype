import { assert } from "../../src/assert.js"
import { cacheAssertions, cleanupAssertions } from "../../src/type/analysis.js"

const isPrecached = process.argv.includes("--reassertTestPreCached")

// prettier-ignore
const metaSnapshotTests = () => {
    // type
    assert({ re: "do" }).equals({ re: "do" }).type.toString.snap(`{ re: string; }`)

    //5
    assert(5).snap(5)

    // object
    assert({ re: `do` }).snap({re: `do`})

    //inlineUpdate
    // @ts-ignore (using internal updateSnapshots hook)
    assert({ re: "dew" }, { updateSnapshots: true }).snap({re: `dew`})

    //update6To5
    // @ts-ignore (using internal updateSnapshots hook)
    assert(5, { updateSnapshots: true }).snap(5)

    //undefined
    // assert(undefined).snap()
}
isPrecached && cacheAssertions()
metaSnapshotTests()
isPrecached && cleanupAssertions()
