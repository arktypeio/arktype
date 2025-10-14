import { attest, cleanup, setup } from "@ark/attest"
import type { makeComplexType } from "./utils.ts"

setup({ typeToStringFormat: { useTabs: true } })

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

attest(5n).snap(5n)

attest(-5n).snap(-5n)

attest({ a: 4n }).snap({ a: 4n })

attest(undefined).snap(undefined)

attest("undefined").snap("undefined")

attest({ a: undefined }).snap({ a: undefined })

attest("multiline\nmultiline").snap(`multiline
multiline`)

attest("with `quotes`").snap("with `quotes`")

attest({
	a2z: `a"'${"" as string}'"z`,
	z2a: `z"'${"" as string}'"a`,
	ark: "type",
	type: "ark"
} as const).type.toString.snap(`{
	readonly a2z: \`a"'\${string}'"z\`
	readonly z2a: \`z"'\${string}'"a\`
	readonly ark: "type"
	readonly type: "ark"
}`)

attest({ [Symbol("mySymbol")]: 1 }).snap({ "Symbol(mySymbol)": 1 })

const it = (name: string, fn: () => void) => fn()

it("can snap instantiations", () => {
	attest.instantiations([212, "instantiations"])
	return {} as makeComplexType<"asbsdfsaodisfhsda">
})

cleanup()
