import { attest, cleanup, setup } from "../../src/main.js"

setup()

attest({ re: "do" }).equals({ re: "do" }).types.toString.snap(`{ re: string; }`)

attest(5).snap(5)

attest({ re: "do" }).snap({ re: `do` })

// @ts-ignore (using internal updateSnapshots hook)
attest({ re: "dew" }, { updateSnapshots: true }).snap({ re: `dew` })

// @ts-ignore (using internal updateSnapshots hook)
attest(5, { updateSnapshots: true }).snap(5)

attest(undefined).snap(`(undefined)`)

attest({ a: undefined }).snap({ a: `(undefined)` })

attest("multiline\nmultiline").snap(`multiline
multiline`)

attest("with `quotes`").snap(`with \`quotes\``)

cleanup()
