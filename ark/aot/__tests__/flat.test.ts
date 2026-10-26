import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { flattenBundle } from "@ark/aot/internal/flat.ts"
import { writeUnscannedFlatMessage } from "@ark/aot/internal/scan.ts"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build, type BuildOptions, type Plugin } from "esbuild"
import {
	build as viteBuild,
	defaultClientConditions,
	type Rolldown
} from "vite"
import { parseSync } from "oxc-parser"
import { join } from "node:path"
import { run, writeFixture } from "./utils.ts"

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts", "production"]

const types = `import { type } from "arktype"

export const Name = type("string > 0")
export const Email = type("string.email")
export const User = type({ name: Name, email: Email })
export const Team = type({ lead: User, members: User.array() })
export const Unread = type({ zebra: Team })
`

const root = writeFixture(
	{
		"types.ts": types,
		"main.ts": `import { type } from "arktype"
import { Team, User } from "./types.ts"

for (const data of [
	{ lead: { name: "Ada", email: "ada@arktype.io" }, members: [] },
	{ lead: { name: "", email: "ada" }, members: [{ name: 5 }] }
]) {
	const out = Team(data)
	console.log(out instanceof type.errors ? out.summary : "valid")
}
console.log(User.allows({ name: "Ada", email: "ada@arktype.io" }))
`
	},
	fromHere("temp", "flat")
)

const bundle = async (
	opts: PrecompileUnpluginOptions = {},
	{ plugins = [], ...options }: BuildOptions = {}
) => {
	const { outputFiles } = await build({
		...(!options.stdin && { entryPoints: [join(root, "main.ts")] }),
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [precompile.esbuild({ conditions, ...opts }), ...plugins],
		...options
	})
	return outputFiles!.map(file => file.text)
}

// a factory's parameter destructuring a unit it reads
const factoryParam = /{ 0: \w+Allows/

contextualize(() => {
	it("declares the units of a one-chunk production bundle in one function", async () => {
		const [flat] = await bundle()
		const [whole] = await bundle({ prune: false })
		attest(run(flat)).snap(`valid
lead.name must be non-empty
lead.email must be an email address
members[0].name must be a string
members[0].email is missing
true
`)
		attest(run(flat)).equals(run(whole))
		attest(factoryParam.test(whole)).equals(true)
		attest(factoryParam.test(flat)).equals(false)
	})

	it("leaves out of the function a unit only a dropped validator reads", async () => {
		const [js] = await bundle(
			{},
			{
				stdin: {
					contents: `import { Team } from "./types.ts"\n\nconsole.log(Team({}))\n`,
					resolveDir: root,
					loader: "ts"
				}
			}
		)
		attest(factoryParam.test(js)).equals(false)
		attest(js.includes("zebra")).equals(false)
	})

	it("returns what kept code reads, annotating nothing a bundler keeps", async () => {
		const [js] = await bundle(
			{},
			{
				stdin: {
					contents: `import { Team } from "./types.ts"\n\nconsole.log(Team({}))\n`,
					resolveDir: root,
					loader: "ts"
				}
			}
		)
		// Team's units read User's, Name's and Email's, whose validators it drops
		// esbuild annotates the function's call itself, as Rolldown doesn't
		const flat =
			/^var \w+ = (?:\(\s*\/\* @__NOINLINE__ \*\/\s*)?(?:\/\* @__PURE__ \*\/ )?\(\(\) => {$([\S\s]*?)^\s*}\)\(\)\s*\)?;$/m.exec(
				js
			)
		attest(flat?.[1].includes("__PURE__")).equals(false)
	})

	it("creates in the function a validator whose creator nothing else calls", async () => {
		const contents = `import { Team } from "./types.ts"\n\nconsole.log(Team({ lead: {}, members: [] }).summary)\n`
		const [js] = await bundle(
			{},
			{ stdin: { contents, resolveDir: root, loader: "ts" } }
		)
		const [whole] = await bundle(
			{ prune: false },
			{ stdin: { contents, resolveDir: root, loader: "ts" } }
		)
		attest(run(js)).snap(`lead.name is missing
lead.email is missing
`)
		attest(run(js)).equals(run(whole))
		attest(js.includes("{ 0: allows")).equals(false)
		attest(js.includes("var Team =")).equals(false)
		// the Allows its creator was passed, now called by name
		attest(/\/\* @__NOINLINE__ \*\/\s+\w+Allows\(data\) \?/.test(js)).equals(
			true
		)
	})

	it("creates in the function validators whose creator others call", async () => {
		const [js] = await bundle()
		const [whole] = await bundle({ prune: false })
		attest(run(js)).equals(run(whole))
		attest(js.includes("var Team =")).equals(false)
		attest(js.includes("var User =")).equals(false)
		attest(js.match(/\({ 0: allows, 1: apply }\) =>/g)?.length).equals(1)
	})

	it("creates in the function a validator under a type assertion", async () => {
		const files = writeFixture(
			{
				"types.ts": types.replace(
					"export const Team = type(",
					"export const Team = <type.Any>type("
				),
				"main.ts": `import { Team } from "./types.ts"\n\nconsole.log(String(Team({ lead: {}, members: [] })))\n`
			},
			fromHere("temp", "flatAsserted")
		)
		const [js] = await bundle({}, { entryPoints: [join(files, "main.ts")] })
		attest(run(js)).snap(`lead.name is missing
lead.email is missing
`)
		attest(js.includes("var Team =")).equals(false)
	})

	it("writes a function its one call passes its parameters where it's called", async () => {
		const files = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const Discount = type({ discount: "number > 0 | null | undefined" })

for (const discount of [0, "0", null]) {
	const out = Discount({ discount })
	console.log(out instanceof type.errors ? out.summary : "valid")
}
`
			},
			fromHere("temp", "flatInlined")
		)
		const options: BuildOptions = { entryPoints: [join(files, "main.ts")] }
		const [js] = await bundle({}, options)
		const [whole] = await bundle({ prune: false }, options)
		attest(run(js)).snap(`discount must be positive
discount must be a number, undefined or null
valid
`)
		attest(run(js)).equals(run(whole))
		// the number branch's Apply is its case of the union's, and null's
		// case has nothing left to check, in Allows as in Apply
		attest(js.match(/case "number": {/g)?.length).equals(1)
		attest(js.match(/case "null":\s+return true/g)?.length).equals(2)
	})

	it("writes a primitive its one call passes where its parameter is read", async () => {
		const files = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const Email = type("string.email")

const out = Email("ada")

if (out instanceof type.errors) console.log(out.summary)
`
			},
			fromHere("temp", "flatPrimitive")
		)
		const [js] = await bundle({}, { entryPoints: [join(files, "main.ts")] })
		attest(run(js)).snap(`must be an email address
`)
		attest(js).satisfies(/"pattern", "an email address"/)
		attest(/const \w+ = "an email address"/.test(js)).equals(false)
	})

	it("reads a unit declared as another of the units as that one", async () => {
		const files = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const User = type({ name: "string", role: "string = 'member'" })

console.log(User({ name: "Ada" }))
`
			},
			fromHere("temp", "flatAlias")
		)
		const [js] = await bundle({}, { entryPoints: [join(files, "main.ts")] })
		attest(run(js)).snap(`{ name: 'Ada', role: 'member' }
`)
		// the object's Transform is its structure's
		attest(js).satisfies(/structure\w+Transform\(data\)/)
		attest(/intersection\w+Transform/.test(js)).equals(false)
	})

	it("creates as its assert a validator read only for it", async () => {
		const files = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const User = type({ name: "string" })

const check = (data: unknown) => User.assert(data)

for (const data of [{ name: "Ada" }, {}]) {
	try {
		console.log(check(data))
	} catch (e) {
		console.log((e as Error).message)
	}
}
`
			},
			fromHere("temp", "flatAssert")
		)
		const options: BuildOptions = { entryPoints: [join(files, "main.ts")] }
		const [js] = await bundle({}, options)
		const [whole] = await bundle({ prune: false }, options)
		attest(run(js)).snap(`{ name: 'Ada' }
name is missing
`)
		attest(run(js)).equals(run(whole))
		attest(/\.assert\b|\bassert:/.test(js)).equals(false)
	})

	it("keeps each unit a module of its own with prune: false", async () => {
		const [whole] = await bundle({ prune: false })
		attest(factoryParam.test(whole)).equals(true)
	})

	it("fails a module another plugin loaded reading a unit it declares in one function", async () => {
		const [whole] = await bundle({ prune: false }, { minify: false })
		const unit = /\/\/ arktype:(~arktype\/intersection\w+)/.exec(whole)![1]
		const loader: Plugin = {
			name: "loader",
			setup: build =>
				build.onLoad({ filter: /[/\\]main\.ts$/ }, () => ({
					contents: `export * from ${JSON.stringify(unit)}\n`,
					loader: "ts",
					resolveDir: root
				}))
		}
		const result = await build({
			entryPoints: [join(root, "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			conditions,
			logLevel: "silent",
			plugins: [loader, precompile.esbuild({ conditions, cwd: root })]
		}).catch((e: { errors: { text: string }[] }) => e)
		attest("errors" in result && result.errors.map(error => error.text)).equals(
			[writeUnscannedFlatMessage("main.ts")]
		)
	})

	it("keeps each unit a module of its own where entries split", async () => {
		const options: BuildOptions = {
			entryPoints: [join(root, "main.ts"), join(root, "types.ts")],
			outdir: join(root, "out"),
			splitting: true
		}
		const split = await bundle({}, options)
		attest(split.some(js => factoryParam.test(js))).equals(true)
	})

	it("declares the units of a one-chunk Vite build in one function", async () => {
		// Vite reads its mode from NODE_ENV
		const viteBundle = async (opts: PrecompileUnpluginOptions) => {
			const { NODE_ENV } = process.env
			process.env.NODE_ENV = "production"
			try {
				const result = (await viteBuild({
					root,
					configFile: false,
					logLevel: "silent",
					plugins: [precompile.vite({ conditions: ["ark-ts"], ...opts })],
					resolve: { conditions: ["ark-ts", ...defaultClientConditions] },
					build: {
						write: false,
						minify: false,
						lib: { entry: "main.ts", formats: ["es"] }
					}
				})) as Rolldown.RolldownOutput[]
				return result[0].output.find(chunk => chunk.type === "chunk")!.code
			} finally {
				if (NODE_ENV === undefined) delete process.env.NODE_ENV
				else process.env.NODE_ENV = NODE_ENV
			}
		}
		const flat = await viteBundle({})
		const whole = await viteBundle({ prune: false })
		attest(run(flat)).equals(run(whole))
		attest(factoryParam.test(whole)).equals(true)
		attest(factoryParam.test(flat)).equals(false)
	})

	it("declares a unit however its array is written", () => {
		// errors "none" writes a unit without its Apply, e.g. [allows, ]
		const arrays = [
			"[(data => data > 0), ]",
			"[(data => data < 9) /* , */ ]",
			"[(data => data !== 5), // apply\n]",
			"[(data => data % 2 === 0) , (data => data) ,]"
		]
		const modules: Record<string, string> = {
			"~arktype/date": `import * as runtime from "arktype/runtime"

const date = /* @__PURE__ */ ((dateR0) => {
const dateAllows = (data => data instanceof Date && dateR0(data))
return [dateAllows, ]
})(runtime.isValidDate)

export { date }`
		}
		for (const [i, array] of arrays.entries()) {
			modules[`~arktype/unit${i}`] =
				`const unit${i} = ${array}\n\nexport { unit${i} }`
		}
		const names = ["date", ...arrays.map((_, i) => `unit${i}`)]
		const site = `${names.map(name => `import { ${name} } from "~arktype/${name}"`).join("\n")}

export const read = [${names.join(", ")}]`
		const flat = flattenBundle(
			{ "site.js": site },
			modules,
			new Map([["site.js", true]]),
			false
		)!
		const written = Object.keys(flat.modules).filter(
			specifier => !(specifier in modules)
		)
		attest(written.length).equals(1)
		const code = flat.modules[written[0]]
		attest(parseSync("flat.js", code, { sourceType: "module" }).errors).equals(
			[]
		)
		attest(code).snap(`import * as runtime from "arktype/runtime"

const [date, unit0, unit1, unit2, unit3] = /* @__NOINLINE__ */ (() => {
const dateR0 = runtime.isValidDate

const dateAllows = (data => data instanceof Date && dateR0(data))

const unit0Allows = (data => data > 0)
const unit1Allows = (data => data < 9) /* , */ 
const unit2Allows = (data => data !== 5)
const unit3Allows = (data => data % 2 === 0) , unit3Apply = (data => data) 
return [[dateAllows], [unit0Allows], [unit1Allows], [unit2Allows], [unit3Allows, unit3Apply]]
})()

export { date, unit0, unit1, unit2, unit3 }
`)
	})

	it("writes in place a once-called function its function declares last", () => {
		const unit = `import * as runtime from "arktype/runtime"

const unit = /* @__PURE__ */ ((unitR0) => {
const unitAllows = (data => unitR0(data))
const unitApply = (data, ctx) => {
	if (unitR0(data)) return true
	return unitFails(data, ctx)
}
const unitFails = (data, ctx) => {
	return !ctx.failsAt(runtime.siteOf("proto", "a Date"), data)
}
return [unitAllows, unitApply]
})(runtime.isValidDate)

export { unit }`
		const flat = flattenBundle(
			{
				"site.js": `import { unit } from "~arktype/unit"\n\nexport const read = unit`
			},
			{ "~arktype/unit": unit },
			new Map([["site.js", true]]),
			false
		)!
		const [code] = Object.entries(flat.modules).flatMap(([specifier, code]) =>
			specifier === "~arktype/unit" ? [] : [code]
		)
		attest(code).snap(`import * as runtime from "arktype/runtime"

const unit = /* @__NOINLINE__ */ (() => {
const unitR0 = runtime.isValidDate

const unitAllows = (data => unitR0(data))
const unitApply = (data, ctx) => {
	if (unitR0(data)) return true
	{
	return !ctx.failsAt(runtime.siteOf("proto", "a Date"), data)
}
}

return [unitAllows, unitApply]
})()

export { unit }
`)
	})

	describe("a module built from code its scan didn't read", () => {
		// resolves reader.ts as the scan reads it, then as another module
		const swapping = (to: string): Plugin => {
			let resolutions = 0
			return {
				name: "swap",
				setup: build =>
					build.onResolve({ filter: /reader\.ts$/ }, () => ({
						path: join(files, resolutions++ ? to : "reader.ts")
					}))
			}
		}

		const files = writeFixture(
			{
				"types.ts": types,
				// an entry's export, read in ways the scan can't see, so it drops nothing
				"reader.ts": `export { Team as read } from "./types.ts"\n`,
				// a copy of User, whose units the bundle declares in one function
				"copying.ts": `import { type } from "arktype"\n\nexport const read = type({ name: "string > 0", email: "string.email" })\n`,
				"other.ts": `import { type } from "arktype"\n\nexport const read = type({ id: "number.integer" })\n`,
				"main.ts": `export { read } from "./reader.ts"\n`
			},
			fromHere("temp", "flatUnscanned")
		)

		const bundleSwapping = (to: string) =>
			build({
				entryPoints: [join(files, "main.ts")],
				absWorkingDir: files,
				bundle: true,
				write: false,
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [swapping(to), precompile.esbuild({ conditions, cwd: files })]
			}).catch((e: { errors: { text: string }[] }) => e)

		it("fails where its validators would read a copy of a unit", async () => {
			const result = await bundleSwapping("copying.ts")
			attest(
				"errors" in result &&
					result.errors.some(error =>
						error.text.includes(writeUnscannedFlatMessage("copying.ts"))
					)
			).equals(true)
		})

		it("builds where they read none", async () => {
			const result = await bundleSwapping("other.ts")
			attest("outputFiles" in result && result.outputFiles!.length).equals(1)
		})
	})
})
