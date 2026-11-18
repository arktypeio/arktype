import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	minifiedSizeOf,
	reachedLengthOf,
	runtimeReachesOf
} from "@ark/aot/internal/runtimeSize.ts"
import { minifiedLengthOf } from "@ark/aot/internal/smaller.ts"

const entry = fromHere("runtimeSize", "entry.ts")

const lengthOf = (...declarations: string[]) =>
	declarations.reduce((sum, code) => sum + minifiedLengthOf(code), 0)

contextualize(() => {
	it("counts the private helpers an export reads, without their types", () => {
		attest(reachedLengthOf(entry, ["described"])).equals(
			lengthOf(
				"describe = (value) => `got ${value}`",
				"described = (value) => describe(value)"
			)
		)
	})

	it("counts a declaration two exports read once", () => {
		attest(reachedLengthOf(entry, ["first", "second"])).equals(
			lengthOf(
				"twice = (n) => n * 2",
				"first = () => twice(1)",
				"second = () => twice(2)"
			)
		)
	})

	it("follows an export to the module it was imported from", () => {
		attest(reachedLengthOf(entry, ["imported"])).equals(
			lengthOf(`imported = () => "imported"`)
		)
	})

	it("counts what the runtime's exports reach as minifiedSizeOf does", () => {
		// two exports reaching a declaration both read
		const names = ["ArkErrors", "applyIssues"]
		const { lengths, reached } = runtimeReachesOf(names)
		const counted = new Set(names.flatMap(name => reached[name]))
		const code = names.map(name => `runtime.${name}`).join("\n")
		attest(
			counted.size < reached.ArkErrors.length + reached.applyIssues.length
		).equals(true)
		attest(
			[...counted].reduce((sum, i) => sum + lengths[i], minifiedLengthOf(code))
		).equals(minifiedSizeOf({ code, modules: {} } as never))
	})
})
