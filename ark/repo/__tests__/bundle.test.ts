import { attest, contextualize } from "@ark/attest"
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { bundle } from "../bundle.ts"

const declaring = (module: string, js: string) =>
	`(globalThis.evaluated ??= []).push("${module}");\n${js.replace(/= {}/g, `= { from: "${module}" }`)}`

const modules = {
	"index.js": declaring(
		"index",
		`export { x } from "./a.js"; export * from "./b.js"; export * from "./i.js"; import "./d.js"; import "./k.js"; import "./l.js"; import "./sub/f.js"; import "./sub/o.js";`
	),
	"a.js": declaring("a", `export const x = {}; export const apart = {};`),
	"b.js": declaring("b", `export const y = {};`),
	"d.js": declaring("d", `export * from "./b.js"; export * from "./e.js";`),
	"e.js": declaring("e", `export { y } from "./b.js";`),
	"h.js": declaring("h", `export {};`),
	"i.js": declaring("i", `export * from "./j.js"; export const i = {};`),
	"j.js": declaring("j", `export * from "./i.js"; export const j = {};`),
	"k.js": declaring(
		"k",
		`export class K {} export let { p, q: [r] } = { p: 1, q: [2] };`
	),
	"l.js": declaring(
		"l",
		`import { x as local } from "./a.js"; export { local };`
	),
	"sub/f.js": declaring("f", `export const apart = {};`),
	"sub/o.js": declaring("o", `export { y as renamed } from "../b.js";`),
	"u.js": declaring("u", `export const unreached = {};`)
}

type Namespace = Record<string, { from?: string }>

const packages: string[] = []

const packageOf = (
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
const bundling = (dir: string) => {
	const cwd = process.cwd()
	process.chdir(dir)
	try {
		bundle()
	} finally {
		process.chdir(cwd)
	}
	return (path: string) => pathToFileURL(join(dir, "out", path)).href
}

const evaluated = () => {
	const global = globalThis as { evaluated?: string[] }
	const order = global.evaluated
	delete global.evaluated
	return order
}

contextualize(() => {
	afterEach(() => {
		for (const dir of packages.splice(0)) rmSync(dir, { recursive: true })
	})

	it("exports every module's names from the main entry", async () => {
		await import(
			pathToFileURL(join(packageOf(modules), "out", "index.js")).href
		)
		const unbundledOrder = evaluated()

		attest(() => bundling(packageOf(modules))).throws(
			'sub/f exports a name the main entry binds otherwise, so ./internal/sub/f.ts must be { "ark-ts": "./sub/f.ts", "types": "./out/sub/f.d.ts", "default": "./out/sub/f.js" }'
		)
		const dir = packageOf(modules, ["sub/f"])
		const fromOut = bundling(dir)

		const root: Namespace = await import(fromOut("index.js"))
		attest(evaluated()).equals([...unbundledOrder!.slice(0, -1), "u", "index"])
		attest(Object.keys(root)).snap([
			"K",
			"apart",
			"apart$sub$f",
			"i",
			"j",
			"local",
			"p",
			"r",
			"renamed",
			"unreached",
			"x",
			"y"
		])
		attest(root.apart.from).equals("a")
		attest(root.local).is(root.x)
		attest(root.renamed).is(root.y)
		attest(root.unreached.from).equals("u")

		attest(readFileSync(join(dir, "out", "sub", "f.js"), "utf8")).snap(
			'export * from "../index.js";\nexport { apart$sub$f as apart } from "../index.js";\n'
		)
		const f: Namespace = await import(fromOut("sub/f.js"))
		attest(f.apart.from).equals("f")
		attest(f.x).is(root.x)
	})

	it("rejects a name a module binds otherwise than the main entry", () => {
		for (const [name, from] of [
			["x", "a"],
			["y", "b"]
		]) {
			const shadowing = packageOf({
				"index.js": `export { x } from "./a.js"; export * from "./b.js";`,
				"a.js": `export const x = {};`,
				"b.js": `export const y = {};`,
				"c.js": `export const ${name} = {};`
			})
			attest(() => bundling(shadowing)).throws(
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
			const colliding = packageOf({
				"index.js": `export * from "./a.js"; export * from "./b.js";`,
				"a.js": `${declaration}; export const a = ${name};`,
				"b.js": `${declaration}; export const b = ${name};`
			})
			attest(() => bundling(colliding)).throws(
				`esbuild renamed ${name} to ${name}2`
			)
		}
		const shadowing = packageOf({
			"index.js": `export const isDate = {}; export const f = () => { const isDate = () => true; return isDate };`
		})
		attest(() => bundling(shadowing)).throws(
			"esbuild renamed isDate to isDate2"
		)
	})

	it("rejects a default export", () => {
		const defaulting = packageOf({
			"index.js": `export * from "./a.js";`,
			"a.js": `export const x = {}; export default {};`
		})
		attest(() => bundling(defaulting)).throws(
			"The main entry can't export default for a, which must export it by name"
		)
	})
})
