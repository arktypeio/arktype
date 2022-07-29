import { assert, cacheAssertions, cleanupAssertions } from "../../../index.js"

const isPrecached = process.argv.includes("--reassertTestPreCached")
isPrecached && cacheAssertions()

assert({ re: "do" }).equals({ re: "do" }).type.toString.snap()

assert(5).snap()

assert({ re: `do` }).snap()

// @ts-ignore (using internal updateSnapshots hook)
assert({ re: "dew" }, { updateSnapshots: true }).snap()

// @ts-ignore (using internal updateSnapshots hook)
assert(5, { updateSnapshots: true }).snap(6)

assert(undefined).snap()

isPrecached && cleanupAssertions()
