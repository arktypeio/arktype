import { attest, contextualize } from "@ark/attest"
import { Precompiler, renderDiagnostic } from "@ark/aot"
import { inFreshProcess, memoryHost, normalized } from "./utils.ts"

// each module's diagnostics and code, as one precompiler built them in order
const answersOf = (files: Record<string, string>, order: string[]) => {
	const precompiler = new Precompiler(memoryHost(files))
	const answers: Record<string, string[]> = {}
	for (const id of order) {
		const { code, diagnostics } = precompiler.precompile(files[id], id)
		answers[id] = [
			...diagnostics.map(renderDiagnostic),
			normalized(code ?? files[id])
		]
	}
	return answers
}

// a module's answer, which building others first can't change
const answerAfter = (
	files: Record<string, string>,
	others: string[],
	id: string
) => {
	const alone = answersOf(files, [id])[id]
	attest(answersOf(files, [...others, id])[id]).equals(alone)
	return alone
}

contextualize(() => {
	it("precompiles a site holding a function another site's definition calls", () => {
		// reading Called evaluates its site, whose units arktype checks with isPositive
		const files = {
			"/types.ts": `import { type } from "arktype"
const isPositive = (n: number) => n > 0
export const Held = type("number").narrow(isPositive)
export const Called = type(["null | 1", ":", isPositive])`,
			"/reader.ts": `import { Called } from "./types.ts"
export const run = (data: unknown) => Called(data)`
		}
		attest(answerAfter(files, ["/reader.ts"], "/types.ts")).snap([
			'import "arktype"\nimport { #0 as $ark#0 } from "~arktype/#1"\nimport { #2 as $ark#2 } from "~arktype/#1"\nimport $arkfixConfig from "~arktype/#3"\nconst isPositive = (n: number) => n > 0\n$arkfixConfig()\nexport const Held = /* @__PURE__ */ $ark#0(isPositive)\nexport const Called = /* @__PURE__ */ $ark#2()'
		])
	})

	it("reads a Type as declared where the site reads it, not where an equal one is", () => {
		// arktype interns V and L as one Type, which only lib.ts declares for main.ts
		const files = {
			"/types.ts": `import { type } from "arktype"
export const V = type("number")`,
			"/lib.ts": `import { type } from "arktype"
export const L = type("number")`,
			"/reader.ts": `import { V } from "./types.ts"
export const run = (data: unknown) => V(data)`,
			"/main.ts": `import { L } from "./lib.ts"
export const json = () => JSON.stringify(L.json)`
		}
		attest(answerAfter(files, ["/reader.ts"], "/main.ts")).snap([
			'import { L } from "./lib.ts"\nimport { #0 as $ark#0 } from "~arktype/#1"\nimport "./lib.ts"\nexport const json = () => JSON.stringify($ark#0())'
		])
	})

	it("finds an island's Type as bound where the site reads it, not where an equal one is", () => {
		const files = {
			"/island.ts": `import { type } from "arktype"
// @ark-runtime
export const I = type("string")`,
			"/lib.ts": `import { type } from "arktype"
const S = type("string")
export const Alias = S`,
			"/main.ts": `import { type } from "arktype"
import { Alias } from "./lib.ts"
export const T = type({ a: Alias })`
		}
		attest(answerAfter(files, ["/island.ts"], "/main.ts")).snap([
			'import "arktype"\nimport { #0 as $ark#0 } from "~arktype/#1"\nimport { Alias } from "./lib.ts"\nexport const T = $ark#0(Alias)'
		])
	})

	it("passes a symbol Symbol.for creates as its own in each module calling it", () => {
		const files = {
			"/a.ts": `import { type } from "arktype"
const key = Symbol.for("key")
export const A = type({ [key]: "string" })`,
			"/b.ts": `import { type } from "arktype"
const key = Symbol.for("key")
export const B = type({ [key]: "number" })`
		}
		attest(answerAfter(files, ["/a.ts"], "/b.ts")).snap([
			'import "arktype"\nimport { #0 as $ark#0 } from "~arktype/#1"\nimport $arkfixConfig from "~arktype/#2"\nconst key = Symbol.for("key")\n$arkfixConfig()\nexport const B = /* @__PURE__ */ $ark#0(key)'
		])
	})

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
