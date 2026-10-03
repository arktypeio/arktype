import { attest, contextualize } from "@ark/attest"
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { bundle } from "../bundle.ts"

const traced = (module: string, js: string) =>
	`(globalThis.evaluated ??= []).push("${module}");\n${js.replace(/= {}/g, `= { from: "${module}" }`)}`

const modules = {
	"index.js": traced(
		"index",
		`export { x } from "./a.js"; export * from "./b.js"; export * from "./i.js"; import "./d.js"; import "./k.js"; import "./l.js"; import "./sub/f.js"; import "./sub/o.js";`
	),
	"a.js": traced("a", `export const x = {}; export const apart = {};`),
	"b.js": traced("b", `export const y = {};`),
	"d.js": traced("d", `export * from "./b.js"; export * from "./e.js";`),
	"e.js": traced("e", `export { y } from "./b.js";`),
	"h.js": traced("h", `export {};`),
	"i.js": traced("i", `export * from "./j.js"; export const i = {};`),
	"j.js": traced("j", `export * from "./i.js"; export const j = {};`),
	"k.js": traced(
		"k",
		`export class K {} export let { p, q: [r] } = { p: 1, q: [2] };`
	),
	"l.js": traced("l", `import { x as local } from "./a.js"; export { local };`),
	"sub/f.js": traced("f", `export const apart = {};`),
	"sub/o.js": traced("o", `export { y as renamed } from "../b.js";`),
	"u.js": traced("u", `export const unreached = {};`)
}

type Namespace = Record<string, { from?: string }>

const packages: string[] = []

const writePackage = (
	modules: Record<string, string>,
	ownFiles: string[] = []
) => {
	const dir = mkdtempSync(join(tmpdir(), "bundle-"))
	packages.push(dir)
	for (const [path, js] of Object.entries(modules)) {
		mkdirSync(join(dir, "out", dirname(path)), { recursive: true })
		writeFileSync(join(dir, "out", path), js)
	}
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({
			name: "bundled",
			type: "module",
			exports: {
				".": "./out/index.js",
				...Object.fromEntries(
					ownFiles.flatMap(module =>
						[".ts", ".js"].map(extension => [
							`./internal/${module}${extension}`,
							{ default: `./out/${module}.js` }
						])
					)
				)
			}
		})
	)
	return dir
}

// attest finds a call's type data by its path from the cwd, so only bundle() runs in dir
const bundleIn = (dir: string) => {
	const cwd = process.cwd()
	process.chdir(dir)
	try {
		bundle()
	} finally {
		process.chdir(cwd)
	}
	return (path: string) => pathToFileURL(join(dir, "out", path)).href
}

const evaluated = () =>
	(globalThis as { evaluated?: string[] }).evaluated?.splice(0)

contextualize(() => {
	afterEach(() => {
		for (const dir of packages.splice(0)) rmSync(dir, { recursive: true })
	})

	it("exports every module's names from the internal entry", async () => {
		await import(
			pathToFileURL(join(writePackage(modules), "out", "index.js")).href
		)
		const unbundledOrder = evaluated()

		attest(() => bundleIn(writePackage(modules))).throws(
			'sub/f exports a name internal.js binds otherwise, so ./internal/sub/f.ts must be { "ark-ts": "./sub/f.ts", "default": "./out/sub/f.js" }'
		)
		const dir = writePackage(modules, ["sub/f"])
		const fromOut = bundleIn(dir)

		const root: Namespace = await import(fromOut("index.js"))
		attest(evaluated()).equals([...unbundledOrder!.slice(0, -1), "u", "index"])
		attest(Object.keys(root)).snap([
			"K$k",
			"apart$a",
			"apart$sub$f",
			"i",
			"j",
			"local$l",
			"p$k",
			"r$k",
			"renamed$sub$o",
			"unreached$u",
			"x",
			"y"
		])

		const internal: Namespace = await import(fromOut("internal.js"))
		attest(evaluated()).equals([])
		attest(Object.keys(internal)).snap([
			"K",
			"K$k",
			"apart",
			"apart$a",
			"apart$sub$f",
			"i",
			"j",
			"local",
			"local$l",
			"p",
			"p$k",
			"r",
			"r$k",
			"renamed",
			"renamed$sub$o",
			"unreached",
			"unreached$u",
			"x",
			"y"
		])
		attest(internal.x).is(root.x)
		attest(internal.apart.from).equals("a")
		attest(internal.local).is(root.x)
		attest(internal.renamed).is(root.y)
		attest(internal.unreached.from).equals("u")

		attest(readFileSync(join(dir, "out", "sub", "f.js"), "utf8")).snap(
			'export * from "../internal.js";\nexport { apart$sub$f as apart } from "../internal.js";\n'
		)
		const f: Namespace = await import(fromOut("sub/f.js"))
		attest(f.apart.from).equals("f")
		attest(f.x).is(root.x)
	})

	it("leaves whole a main entry that exports every module's names", () => {
		const dir = writePackage({
			"index.js": `export * from "./a.js";`,
			"a.js": `export const a = {};`
		})
		bundleIn(dir)
		attest(readdirSync(join(dir, "out"))).equals(["index.js", "internal.js"])
		attest(readFileSync(join(dir, "out", "internal.js"), "utf8")).snap(
			'export * from "./index.js";\n'
		)
	})

	it("rejects rebinding a main entry export", () => {
		for (const [name, from] of [
			["x", "a"],
			["y", "b"]
		]) {
			const shadowing = writePackage({
				"index.js": `export { x } from "./a.js"; export * from "./b.js";`,
				"a.js": `export const x = {};`,
				"b.js": `export const y = {};`,
				"c.js": `export const ${name} = {};`
			})
			attest(() => bundleIn(shadowing)).throws(
				`The main entry exports ${name}, which one of ${from}, c binds otherwise`
			)
		}
	})

	it("rejects a function or class esbuild renamed", () => {
		for (const [name, declaration] of [
			["isDate", "const isDate = () => true"],
			["parse", "function parse() {}"],
			["Foo", "class Foo { static self = Foo }"]
		]) {
			const colliding = writePackage({
				"index.js": `export * from "./a.js"; export * from "./b.js";`,
				"a.js": `${declaration}; export const a = ${name};`,
				"b.js": `${declaration}; export const b = ${name};`
			})
			attest(() => bundleIn(colliding)).throws(
				`esbuild renamed ${name} to ${name}2`
			)
		}
		const shadowing = writePackage({
			"index.js": `export const isDate = {}; export const f = () => { const isDate = () => true; return isDate };`
		})
		attest(() => bundleIn(shadowing)).throws(
			"esbuild renamed isDate to isDate2"
		)
	})

	it("rejects a default export", () => {
		const defaulting = writePackage({
			"index.js": `export * from "./a.js";`,
			"a.js": `export const x = {}; export default {};`
		})
		attest(() => bundleIn(defaulting)).throws(
			"internal.js can't export default for a, which must export it by name"
		)
	})
})
