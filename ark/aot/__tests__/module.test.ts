import { attest, contextualize } from "@ark/attest"
import { SourceModule } from "@ark/aot/internal/module.ts"

const importing = (count: number) =>
	Array.from(
		{ length: count },
		(_, i) => `import { unit${i} as $ark_unit${i} } from "~arktype/units"\n`
	).join("")

// what a tree holds but its parents, which point back up it
const shapeOf = (node: unknown) =>
	JSON.parse(JSON.stringify(node, (k, v) => (k === "parent" ? undefined : v)))

contextualize(() => {
	// oxc's raw transfer ends the process on such a module, so it's read as JSON:
	// were it not, this run would end here
	it("reads a module of more import declarations than raw transfer survives", () => {
		const count = 6000
		const { program, parseErrors, scopes } = new SourceModule(
			"/main.ts",
			`${importing(count)}export const first = $ark_unit0\n`,
			"main.ts"
		)
		attest(parseErrors.length).equals(0)
		attest(program.body.length).equals(count + 1)
		attest(Object.keys(scopes.root.bindings).length).equals(count + 1)
		attest(scopes.root.bindings.$ark_unit5999.kind).equals("import")
		// and as the tree raw transfer reads of a module it does survive
		const few = new SourceModule("/main.ts", importing(2), "main.ts")
		attest(shapeOf(program.body[1])).equals(shapeOf(few.program.body[1]))
	})
	it("reads a // @ark-runtime marker past the reason after it", () => {
		const module = new SourceModule(
			"/main.ts",
			`import { type } from "arktype"

// @ark-runtime its shape is loaded
export const Shaped = type({ a: "string" })
// @ark-runtimes
export const Other = type({ b: "string" })
`,
			"main.ts"
		)
		// a misspelled marker is no marker
		attest(module.islands.map(island => module.textOf(island))).equals([
			'export const Shaped = type({ a: "string" })'
		])
	})
})
