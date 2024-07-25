import { attest, cleanup, setup } from "@ark/attest"
import type { makeComplexType } from "./utils.js"

setup()

attest({ re: "do" }).equals({ re: "do" }).type.toString.snap("{ re: string }")

attest({
	ark: "type",
	type: "script",
	vali: "dator",
	opti: "mized",
	from: "editor",
	to: "runtime"
}).snap({
	ark: "type",
	type: "script",
	vali: "dator",
	opti: "mized",
	from: "editor",
	to: "runtime"
}).type.toString.snap(`{
	ark: string
	type: string
	vali: string
	opti: string
	from: string
	to: string
}`)

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

const it = (name: string, fn: () => void) => fn()

it("can snap instantiations", () => {
	type Z = makeComplexType<"asbsdfsaodisfhsda">
	attest.instantiations([229, "instantiations"])
})

cleanup()
