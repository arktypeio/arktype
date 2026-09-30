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

// each module records that it evaluated, and tags the objects it declares
// with its name
const declaring = (module: string, js: string) =>
	`(globalThis.evaluated ??= []).push("${module}");\n${js.replace(/(= |default ){}/g, `$1{ from: "${module}" }`)}`

// a package's modules as tsc emits them, one export case each
const modules = {
	"index.js": declaring(
		"index",
		`export { x } from "./a.js"; export * from "./b.js"; export * from "./i.js"; import "./c.js"; import "./d.js"; import "./f.js"; import "./k.js"; import "./l.js"; import "./sub/o.js";`
	),
	"a.js": declaring(
		"a",
		`export const x = {}; export const shared = {}; export default {};`
	),
	"b.js": declaring("b", `export const y = {}; export const shared = {};`),
	// a name two `export *` bind differently is ambiguous
	"c.js": declaring("c", `export * from "./a.js"; export * from "./b.js";`),
	// but not if both bind it alike
	"d.js": declaring("d", `export * from "./a.js"; export * from "./e.js";`),
	"e.js": declaring("e", `export { shared } from "./a.js";`),
	// an own export shadows an `export *`
	"f.js": declaring("f", `export * from "./a.js"; export const shared = {};`),
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
	"sub/o.js": declaring(
		"o",
		`export { y as renamed } from "../b.js"; export * from "../c.js";`
	),
	// the main entry doesn't evaluate it until it exports its names
	"u.js": declaring("u", `export const unreached = {};`)
}

// the modules exporting a name the main entry binds otherwise
const ownFiles = ["a", "d", "e", "f"]

type Namespace = Record<string, { from?: string }>

contextualize(() => {
	it("exports every module's names from the main entry", async () => {
		const dir = mkdtempSync(join(tmpdir(), "bundle-"))
		const fromOut = (path: string) => join(dir, "bundled", "out", path)
		const writePackageJson = (modules: string[]) =>
			writeFileSync(
				join(dir, "bundled", "package.json"),
				JSON.stringify({
					name: "bundled",
					type: "module",
					exports: {
						".": "./out/index.js",
						...Object.fromEntries(
							modules.flatMap(module =>
								[".ts", ".js"].map(extension => [
									`./internal/${module}${extension}`,
									{ default: `./out/${module}.js` }
								])
							)
						)
					}
				})
			)
		const cwd = process.cwd()
		// attest looks up a call's type data by its file's path from the
		// working directory, so only bundle() runs from the package
		const bundleInPackage = () => {
			process.chdir(join(dir, "bundled"))
			try {
				bundle()
			} finally {
				process.chdir(cwd)
			}
		}
		try {
			for (const [path, js] of Object.entries(modules)) {
				for (const copy of ["unbundled", "bundled"]) {
					mkdirSync(join(dir, copy, "out", dirname(path)), { recursive: true })
					writeFileSync(join(dir, copy, "out", path), js)
				}
			}
			// the modules that evaluated since last called, in order
			const evaluated = () => {
				const global = globalThis as { evaluated?: string[] }
				const order = global.evaluated
				delete global.evaluated
				return order
			}
			await import(
				pathToFileURL(join(dir, "unbundled", "out", "index.js")).href
			)
			const unbundledOrder = evaluated()

			writePackageJson([])
			attest(bundleInPackage).throws(
				'a exports a name the main entry binds otherwise, so ./internal/a.ts must be { "ark-ts": "./a.ts", "types": "./out/a.d.ts", "default": "./out/a.js" }'
			)
			writePackageJson(ownFiles)
			bundleInPackage()

			const root: Namespace = await import(
				pathToFileURL(fromOut("index.js")).href
			)
			// u evaluates last of the modules, before the main entry's own code
			attest(evaluated()).equals([
				...unbundledOrder!.slice(0, -1),
				"u",
				"index"
			])
			attest(Object.keys(root)).snap([
				"K",
				"default$a",
				"i",
				"j",
				"local",
				"p",
				"r",
				"renamed",
				"shared",
				"shared$a",
				"shared$f",
				"unreached",
				"x",
				"y"
			])
			attest(root.shared.from).equals("b")
			attest(root.local).is(root.x)
			attest(root.renamed).is(root.y)
			attest(root.unreached.from).equals("u")

			const own: Record<string, Namespace> = {}
			for (const module of ownFiles)
				own[module] = await import(pathToFileURL(fromOut(`${module}.js`)).href)
			attest(readFileSync(fromOut("d.js"), "utf8")).snap(
				'export * from "./index.js";\nexport { shared$a as shared } from "./index.js";\n'
			)
			attest(own.a.default.from).equals("a")
			for (const module of ["a", "d", "e"])
				attest(own[module].shared).is(root.shared$a)
			attest(own.a.shared.from).equals("a")
			attest(own.f.shared.from).equals("f")
			// each also exports the main entry's other names
			attest(own.f.x).is(root.x)
		} finally {
			rmSync(dir, { recursive: true })
		}
	})
})
