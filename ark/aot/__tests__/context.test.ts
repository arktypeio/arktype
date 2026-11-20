import { attest, contextualize } from "@ark/attest"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"
import { run, statusesOf, tempPath, writeFixture } from "./utils.ts"

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts", "production"]

const types = `import { scope, type } from "arktype"
const Street = type("string").narrow(
	(s, ctx) => s === ctx.context?.savedStreet || s.length > 3 || ctx.mustBe("a full street")
)
export const Contact = type({ name: "string", address: { street: Street } })
export const Destination = type({
	data: type.or(
		{ type: "'bank'", beneficiary: Contact },
		{ type: "'crypto'", wallet: "string" }
	)
})
export const Chain = scope({ link: { street: Street, "next?": "link" } }).export().link
export const Parsed = type("string")
	.pipe((s, ctx) => s + (ctx.context?.savedStreet === s ? "" : "!"))
	.pipe(Street)
`

const app = `${types}
const saved = { savedStreet: "Elm" }
const contact = { name: "a", address: { street: "Elm" } }
const cases = [
	[Contact, contact],
	[Destination, { data: { type: "bank", beneficiary: contact } }],
	[Chain, { street: "Elm Street", next: { street: "Elm" } }],
	[Parsed, "Elm"]
]
const ok = out => out instanceof Error || out?.issues || out?.[" arkKind"] === "errors" || out?.constructor?.name?.includes("Errors") ? "invalid" : "ok"
for (const [T, data] of cases) {
	const Bound = T.withContext(saved)
	let thrown = "ok"
	try { Bound.assert(data) } catch { thrown = "threw" }
	console.log([
		ok(T(data)),
		ok(Bound(data)),
		ok(Bound(data)),
		thrown,
		Bound.allows(data),
		ok(Bound["~standard"].validate(data)),
		ok(T["~standard"].validate(data, { libraryOptions: { context: saved } })),
		ok(T(data))
	].join(" "))
}
`

const bundle = async (root: string, opts: PrecompileUnpluginOptions) => {
	const { outputFiles } = await build({
		entryPoints: [join(root, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [precompile.esbuild({ cwd: root, conditions, ...opts })]
	})
	return outputFiles![0].text
}

// each case: unbound, bound (twice, as a validator is created at its first
// call), bound assert, bound allows, bound ~standard, libraryOptions, unbound again
const expected = [
	"invalid ok ok ok true ok ok invalid",
	"invalid ok ok ok true ok ok invalid",
	"invalid ok ok ok true ok ok invalid",
	"ok ok ok ok true ok ok ok"
]

contextualize(function (this: Mocha.Suite) {
	this.timeout(120_000)

	it("precompiles a narrow reading ctx.context", () => {
		attest(statusesOf(types)).snap([
			"2:16 accepted string & fn$hole_hgu1b30q64q3u",
			"5:24 accepted { address: { street: string & fn$hole_hgu1b30q64q3u }, name: string }",
			'6:28 accepted { data: { beneficiary: { address: { street: string & fn$hole_hgu1b30q64q3u }, name: string }, type: "bank" } | { type: "crypto", wallet: string } }',
			"12:22 accepted { street: string & fn$hole_hgu1b30q64q3u, next?: $link }",
			"13:23 accepted (In: string) => To<string & fn$hole_hgu1b30q64q3u>"
		])
	})

	// without context, each case's saved street is too short; bound, it passes,
	// and Parsed's morph sees it too (`Elm!` would pass on its own, so it's valid either way)
	for (const errors of ["detailed", "first", "none"] as const) {
		it(`validates in a bound context with errors ${errors}`, async () => {
			const root = writeFixture({ "main.ts": app }, tempPath("context", errors))
			const js = await bundle(root, errors === "detailed" ? {} : { errors })
			// arktype itself is left out, so each validator is precompiled
			attest(js.includes("withContextOf")).equals(true)
			attest(js.includes("BaseScope")).equals(false)
			attest(run(js).trim().split("\n")).equals(expected)
		})
	}
})
