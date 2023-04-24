import * as process from "node:process"
import { attest, cacheAssertions, cleanupAssertions } from "../../src/main.js"

const isPrecached = process.argv.includes("--attestTestPreCached")
isPrecached && cacheAssertions()

attest({ re: "do" }).equals({ re: "do" }).types.toString.snap()

attest(5).snap()

attest({ re: "do" }).snap()

// @ts-ignore (using internal updateSnapshots hook)
attest({ re: "dew" }, { updateSnapshots: true }).snap()

// @ts-ignore (using internal updateSnapshots hook)
attest(5, { updateSnapshots: true }).snap(6)

attest(undefined).snap()

attest({ a: undefined }).snap()

attest("multiline\nmultiline").snap()

attest("with `quotes`").snap()

isPrecached && cleanupAssertions()
