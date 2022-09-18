import { assert, cacheAssertions, cleanupAssertions } from "../../../index.js"

const isPrecached = process.argv.includes("--reassertTestPreCached")
isPrecached && cacheAssertions()

assert({ re: "do" }).equals({ re: "do" }).type.toString.snap(`{ re: string; }`)

assert(5).snap(5)

assert({ re: `do` }).snap({ re: `do` })

// @ts-ignore (using internal updateSnapshots hook)
assert({ re: "dew" }, { updateSnapshots: true }).snap({ re: `dew` })

// @ts-ignore (using internal updateSnapshots hook)
assert(5, { updateSnapshots: true }).snap(5)

assert(undefined).snap(`<undefined>`)

assert({ a: undefined }).snap({ a: `<undefined>` })

isPrecached && cleanupAssertions()
