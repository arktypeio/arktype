import { attest, contextualize } from "@ark/attest"
import { Precompiler } from "@ark/aot"
import { inFreshProcess, memoryHost, normalized } from "./utils.ts"

contextualize(() => {
	it("bakes json naming a value without the count of names the build gave before", () => {
		const source = `import { type } from "arktype"
const isPositive = (n: number) => n > 0
export const T = type({ n: type("number").narrow(isPositive), url: "string.url" })
export const json = () => T.json`
		// a process names each value after those named alike before it
		const [first, again] = inFreshProcess(
			async (source: string) => {
				const { nameOf } = await import("@ark/util")
				const { precompileModule } = await import("@ark/aot")
				const { memoryHost } = await import("./utils.ts")
				nameOf({})
				const jsonOf = () =>
					Object.values(
						precompileModule(
							source,
							"/main.ts",
							memoryHost({ "/main.ts": source })
						).modules
					)
						.flatMap(module => module.split("\n"))
						.filter(line => line.includes("runtime.deepFreeze("))
				return [jsonOf(), jsonOf()]
			},
			[source]
		)
		attest(again).equals(first)
		attest(normalized(first)).snap([
			'const json0 = runtime.deepFreeze({ "required": [{ "key": "n", "value": { "domain": "number", "predicate": ["$ark." + runtime.baseNameOf(p0)] } }, { "key": "url", "value": { "domain": "string", "predicate": [{ "predicate": "$ark.isParsableUrl", "meta": { "description": "a URL string", "keyword": "string.url", "jsonSchema": "$ark.object" } }] } }], "domain": "object" })'
		])
	})

	it("bakes a string reading like a registered reference as written", () => {
		const source = `import { type } from "arktype"
export const T = type("'$ark.fn$9'").describe("$ark.fn$9")
export const json = () => T.json`
		const lines = Object.values(
			new Precompiler(memoryHost({ "/main.ts": source })).precompile(
				source,
				"/main.ts"
			).modules
		)
			.flatMap(module => module.split("\n"))
			.filter(line => line.includes("runtime.deepFreeze("))
		attest(normalized(lines)).snap([
			'const #0 = /* @__PURE__ */ (() => runtime.deepFreeze({ "unit": "\\"$ark.fn$9\\"", "meta": "\\"$ark.fn$9\\"" }))()'
		])
	})
})
