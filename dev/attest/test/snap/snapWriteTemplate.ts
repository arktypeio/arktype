import { attest, cleanup, setup } from "../../src/main.js"

setup()

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

cleanup()
