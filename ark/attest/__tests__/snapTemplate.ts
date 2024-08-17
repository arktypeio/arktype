import { attest, cleanup, setup } from "@ark/attest"
import type { makeComplexType } from "./utils.ts"

setup({ typeToStringFormat: { useTabs: true } })

attest({ re: "do" }).equals({ re: "do" }).type.toString.snap()

attest({
	ark: "type",
	type: "script",
	vali: "dator",
	opti: "mized",
	from: "editor",
	to: "runtime"
})
	.snap()
	.type.toString.snap()

attest(5).snap()

attest({ re: "do" }).snap()

// @ts-expect-error (using internal updateSnapshots hook)
attest({ re: "dew" }, { cfg: { updateSnapshots: true } }).snap({ re: "do" })

// @ts-expect-error (using internal updateSnapshots hook)
attest(5, { cfg: { updateSnapshots: true } }).snap(6)

attest(undefined).snap()

attest({ a: undefined }).snap()

attest("multiline\nmultiline").snap()

attest("with `quotes`").snap()

attest({
	a2z: `a"'${"" as string}'"z`,
	z2a: `z"'${"" as string}'"a`,
	ark: "type",
	type: "ark"
} as const).type.toString.snap()

const it = (name: string, fn: () => void) => fn()

it("can snap instantiations", () => {
	type Z = makeComplexType<"asbsdfsaodisfhsda">
	attest.instantiations()
})

cleanup()
