import { attest, contextualize } from "@ark/attest"
import { Precompiler } from "@ark/precompile"
import { memoryHost, statusesOf } from "./utils.ts"

const libraryFiles = (manifest: object) => ({
	"/node_modules/lib/package.json": JSON.stringify(manifest),
	"/node_modules/lib/index.js": `import { type } from "arktype"
export const User = type({ name: "string" })`
})

contextualize(() => {
	it("follows a package that opts in", () => {
		const source = `import { User } from "lib"
export const Admin = User.and({ role: "'admin'" })`
		const optedIn = libraryFiles({ name: "lib", arktype: { precompile: true } })
		attest(statusesOf(source, optedIn)).snap([
			'2:22 accepted { name: string, role: "admin" }'
		])
		attest(statusesOf(source, libraryFiles({ name: "lib" }))).snap([])
		attest([
			new Precompiler(memoryHost(optedIn)).readDependency(
				"/node_modules/lib/index.js"
			),
			new Precompiler(memoryHost(libraryFiles({ name: "lib" }))).readDependency(
				"/node_modules/lib/index.js"
			)
		]).snap([
			{ errors: [], warnings: [] },
			{
				errors: [],
				warnings: [
					"lib imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws"
				]
			}
		])
	})
})
