import { attest, cleanup, setup } from "@arktype/attest"

setup()

attest({ re: "do" }).equals({ re: "do" }).type.toString.snap("{ re: string; }")

attest(5).snap(5)

attest({ re: "do" }).snap({ re: "do" })

// @ts-expect-error (using internal updateSnapshots hook)
attest({ re: "dew" }, { cfg: { updateSnapshots: true } }).snap({ re: "dew" })

// @ts-expect-error (using internal updateSnapshots hook)
attest(5, { cfg: { updateSnapshots: true } }).snap(5)

attest(undefined).snap("(undefined)")

attest({ a: undefined }).snap({ a: "(undefined)" })

attest("multiline\nmultiline").snap(`multiline
multiline`)

attest("with `quotes`").snap("with `quotes`")

cleanup()
