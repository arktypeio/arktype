import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { writeUnscannedFlatMessage } from "@ark/aot/internal/scan.ts"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build, type BuildOptions, type Plugin } from "esbuild"
import {
	build as viteBuild,
	defaultClientConditions,
	type Rolldown
} from "vite"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { writeFixture } from "./utils.ts"

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

const run = (js: string) =>
	spawnSync(process.execPath, ["--input-type=module"], {
		input: js,
		encoding: "utf8"
	}).stdout

// a factory's parameter destructuring a unit it reads
const factoryParam = /{ 0: \w+Allows/

contextualize(() => {
	it("declares the units of a one-chunk production bundle in one function", async () => {
		const [flat] = await bundle()
		const [whole] = await bundle({ prune: false })
		attest(run(flat)).snap(
			"valid\nlead.email must be an email address\nlead.name must be non-empty\nmembers[0].email is missing\nmembers[0].name must be a string\ntrue\n"
		)
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
			/^var \w+ = (?:\/\* @__PURE__ \*\/ )?\(\(\) => {$([\S\s]*?)^}\)\(\);$/m.exec(
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
		attest(run(js)).snap("lead.email is missing\nlead.name is missing\n")
		attest(run(js)).equals(run(whole))
		attest(js.includes("{ 0: allows")).equals(false)
		attest(js.includes("var Team =")).equals(false)
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
