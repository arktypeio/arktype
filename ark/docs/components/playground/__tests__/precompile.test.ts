/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { precompileModule, type PrecompileHost } from "@ark/aot"
import { minifiedSizeOf } from "@ark/aot/internal/runtimeSize.ts"
import { smallerOf } from "@ark/aot/internal/smaller.ts"
import { attest, contextualize } from "@ark/attest"
import type { Optimization } from "arktype/internal/standalone.ts"
import { transformSync } from "esbuild"
import { writePrecompiled } from "../precompile.ts"

const path = "/main.ts"

const sourceOf = (program: string) =>
	`import { scope, type } from "arktype"\n\n${program}\n`

// the inline build's validators, read through the names it imports them as
const builtValidatorsOf = (source: string, optimize: Optimization) => {
	const host: PrecompileHost = {
		resolve: specifier => `/node_modules/${specifier}/index.js`,
		readFile: file => (file === path ? source : undefined)
	}
	const { code } = precompileModule(source, path, host, {
		inline: true,
		optimize
	})
	const body = /\(\) => precompiledForArktype\w+;\n([\S\s]*?)\nreturn {/.exec(
		code
	)
	return body && collapse(body[1].replaceAll("$ark$0$", "runtime."))
}

const collapse = (code: string) => code.replace(/\s+/g, " ").trim()

// the tab's validators, as the editor's emit runs them, without what the
// inline build replaces by linking them into the module
const shownValidatorsOf = async (source: string, optimize: Optimization) => {
	const js = transformSync(source, { loader: "ts", format: "esm" }).code
	const { written, refusals } = await writePrecompiled(source, js, optimize)
	if (Object.keys(refusals).length) return refusals
	const [checkers, compiled] = written
	const chosen =
		compiled === undefined ? checkers : (
			smallerOf(
				checkers,
				() => compiled,
				code => minifiedSizeOf({ code, modules: {} } as never)
			)
		)
	return collapse(
		chosen
			.replace(/^import .*$|^\(\) => .*$|^export {.*}$/gm, "")
			.replaceAll(/\n{2,}/g, "\n")
	)
}

const writesAsABuild = (program: string) => async () => {
	const source = sourceOf(program)
	for (const optimize of ["speed", "size"] as const) {
		const built = builtValidatorsOf(source, optimize)
		attest(built).satisfies("string")
		attest(await shownValidatorsOf(source, optimize)).equals(built!)
	}
}

const refuses = async (program: string) =>
	shownValidatorsOf(sourceOf(program), "speed")

contextualize(() => {
	it(
		"writes a Type without functions",
		writesAsABuild(
			`const Thing = type({ name: "string", "versions?": "(number | string)[]" })`
		)
	)

	it(
		"keeps a size build's checkers where they're smaller",
		writesAsABuild(
			`const Thing = type({ a: "number = 5", b: "string[] | null" })`
		)
	)

	it(
		"passes a morph written in its definition",
		writesAsABuild(
			`const Thing = type({ name: "string" }).pipe(o => o.name.trim())`
		)
	)

	it(
		"passes a function declared before the definition",
		writesAsABuild(
			`const isEven = (n: number) => n % 2 === 0\nconst Thing = type("number").narrow(isEven)`
		)
	)

	it(
		"passes a function declared after the definition reads it",
		writesAsABuild(
			`const Thing = type("number").narrow(isEven)\nfunction isEven(n: number) { return n % 2 === 0 }`
		)
	)

	it(
		"labels a class where the source reads it, whatever the emit drops",
		writesAsABuild(
			`interface Opts { min: number }\n\nclass Foo { x: number = 1 }\nconst Thing = type.instanceOf(Foo)`
		)
	)

	it(
		"passes functions in the order the definition reads them",
		writesAsABuild(
			'const Thing = type("string").pipe(s => s.length).or(type("number").pipe(n => `${n}`))'
		)
	)

	it(
		"folds a site nested in a definition",
		writesAsABuild(
			`const limit = 5\nconst Thing = type({ name: "string", size: type("number").narrow(n => n < limit) }).pipe(o => o.name.trim())`
		)
	)

	it(
		"writes each of a module's sites",
		writesAsABuild(
			`const Inner = type({ x: "string" })\nconst Thing = type({ inner: Inner, n: "number" })\nconst out = Thing({ inner: { x: "" }, n: 0 })`
		)
	)

	it(
		"writes a scope and what it parses",
		writesAsABuild(
			`const $ = scope({ user: { name: "string", friends: "user[]" } })\nconst Thing = $.type("user")`
		)
	)

	it(
		"reads a value off a site as no site of its own",
		writesAsABuild(
			`const types = scope({ id: "string.uuid", user: { id: "id" } }).export()\nconst Thing = types.user`
		)
	)

	it("refuses a definition reading a Type that holds functions", async () => {
		attest(
			await refuses(
				`const Inner = type("string").pipe(s => s.trim())\nconst Thing = type({ inner: Inner })`
			)
		).snap({
			Thing:
				"it reads Inner, which holds functions, so a build passes Inner to its validator, which the playground doesn't write"
		})
	})

	it("refuses a definition reading what the program can change", async () => {
		attest(
			await refuses(
				`const opts = { min: 5 }\nconst Thing = type("number").atLeast(opts.min)`
			)
		).snap({
			Thing:
				"it reads opts, which the program can change, so a build checks opts as its validator is created, which the playground doesn't write"
		})
	})

	it("refuses a function read off another value", async () => {
		attest(
			await refuses(
				`const Thing = type({ n: "number" }).narrow({ check: (o: { n: number }) => o.n > 0 }.check)`
			)
		).snap({
			Thing:
				"Thing holds Function(check$hole_1i84hkb1ixvhzv), which the playground can't trace to where Thing reads it"
		})
	})
})
