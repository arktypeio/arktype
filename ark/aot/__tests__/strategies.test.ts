import { attest, contextualize } from "@ark/attest"
import { precompile as plugin } from "@ark/aot/unplugin"
import type { PrecompileOptions } from "@ark/aot"
import { build } from "esbuild"
import { join } from "node:path"
import {
	diagnosticsOf,
	precompile,
	run,
	runCli,
	writeFixture
} from "./utils.ts"

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

const money = `import { type } from "arktype"

export const Money = type({ amount: "number > 0", currency: "string == 3" })
`

// a hot Type a cold one composes
const composed = `${money}
export const Order = type({ id: "string", total: Money })
`

// what a module's validators are written as: a build for speed declares each
// check as a function of its own, and one for size calls the runtime's checkers
const formsOf = (source: string, opts: PrecompileOptions) => {
	const { modules } = precompile(source, {}, opts)
	return Object.keys(modules)
		.filter(specifier => /intersection/.test(specifier))
		.map(
			specifier =>
				`${specifier.replace(/(?<=intersection)\w+$/, "")} ${
					/runtime\.props\(/.test(modules[specifier]) ? "checker"
					: /function \w+Allows/.test(modules[specifier]) ? "compiled"
					: "other"
				}`
		)
}

const bundle = async (root: string, opts: PrecompileOptions = {}) => {
	const { outputFiles } = await build({
		entryPoints: [join(root, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [plugin.esbuild({ cwd: root, conditions, ...opts })]
	})
	return outputFiles![0].text
}

contextualize(function (this: Mocha.Suite) {
	this.timeout(60_000)

	it("writes each definition as the key naming it says", () => {
		attest(
			formsOf(composed, { schemas: { "/main.ts#Order": "smallest" } })
		).snap([
			"~arktype/intersection other",
			"~arktype/intersection other",
			"~arktype/intersection other",
			"~arktype/size/intersection checker"
		])
	})
})
