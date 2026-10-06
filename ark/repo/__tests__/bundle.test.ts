import { attest, contextualize } from "@ark/attest"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { bundle } from "../bundle.ts"

const traced = (module: string, js: string) =>
	`(globalThis.evaluated ??= []).push("${module}");\n${js}`

const packages: string[] = []

const writePackage = (
	modules: Record<string, string>,
	exports: Record<string, string> = { ".": "./out/index.js" }
) => {
	const dir = mkdtempSync(join(tmpdir(), "bundle-"))
	packages.push(dir)
	for (const [path, js] of Object.entries(modules)) {
		mkdirSync(join(dir, "out", dirname(path)), { recursive: true })
		writeFileSync(join(dir, "out", path), js)
	}
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({ name: "bundled", type: "module", exports })
	)
	return dir
}

// only bundle() runs in dir, since attest finds type data by its path from the cwd
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

	it("entries share their modules", async () => {
		const dir = writePackage(
			{
				"index.js": traced("index", `export { x } from "./a.js";`),
				"internal.js": traced(
					"internal",
					`export * from "./a.js"; export * from "./b.js";`
				),
				"a.js": traced("a", `export const x = {};`),
				"b.js": traced("b", `export const y = {};`)
			},
			{ ".": "./out/index.js", "./internal": "./out/internal.js" }
		)
		const fromOut = bundleIn(dir)

		const root = await import(fromOut("index.js"))
		attest(evaluated()).equals(["a", "index"])
		attest(Object.keys(root)).equals(["x"])

		const internal = await import(fromOut("internal.js"))
		attest(evaluated()).equals(["b", "internal"])
		attest(Object.keys(internal)).equals(["x", "y"])
		attest(internal.x).is(root.x)
	})

	it("names a self-referencing class", async () => {
		const dir = writePackage({
			"index.js": `export class K { static self = { K }; m(o) { return o.K } _K() {} }`
		})
		const { K } = await import(bundleIn(dir)("index.js"))
		attest(K.name).equals("K")
		attest(K.self.K).is(K)
	})

	it("rejects renaming a named class", () => {
		for (const [innerName, body] of [
			["Y", "m() { return L }"],
			["_L", "static self = { _L }"]
		]) {
			const selfNamed = writePackage({
				"index.js": `export let L = class ${innerName} { ${body} }`
			})
			attest(() => bundleIn(selfNamed)).throws(
				`Can't rename class ${innerName} to L`
			)
		}
	})

	it("rejects esbuild renames", () => {
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
})
