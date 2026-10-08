import { attest, contextualize } from "@ark/attest"
import { diagnosticsOf, precompile } from "./utils.ts"

contextualize(() => {
	describe("configuration", () => {
		it("static configure in the config module", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
const max = 5
configure({
	exactOptionalPropertyTypes: false,
	number: { description: () => \`a number below \${max}\` },
	onFail: errors => errors.throw()
})`,
					{},
					{ config: "/main.ts" }
				)
			).snap([])
		})

		it("configure outside the config module", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })`,
					{},
					{ config: "/config.ts" }
				)
			).snap([
				"/main.ts:2:1  configure() is called outside the config module /config.ts\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
			attest(
				diagnosticsOf(`import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })`)
			).snap([
				"/main.ts:2:1  configure() is called, but the build has no `config` module\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})

		it("configure more than once", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })
configure({ numberAllowsNaN: true })`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				"/main.ts:3:1  configure() is called more than once\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})

		it("configure with values that are not static", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
configure({ numberAllowsNaN: process.argv.includes("--nan") })`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				'/main.ts:2:1  configure({ numberAllowsNaN: process.argv.includes("--nan")… is not static\n  `process` is a global the build does not read\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build\'s `config` module.'
			])
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
const describe = (n: unknown) => {
	const text = "a number"
	return text
}
configure({ number: { description: describe } })`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				"/main.ts:6:1  configure({ number: { description: describe } }) is not static\n  the description writer at /main.ts:2:18 must be a static helper, since arktype calls it while defining types\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})
	})

	describe("standalone", () => {
		it("arktype used outside a site", () => {
			attest(
				diagnosticsOf(`import { type, ArkErrors } from "arktype"
const make = type
const User = type({ name: "string" })
export const check = (data: unknown) => {
	const result = User(data)
	if (result instanceof type.errors || result instanceof ArkErrors) return result
	return User.assert(result)
}`)
			).snap([
				'/main.ts:2:14  `type` is used outside a precompiled site\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("cache mode reports without rejecting", () => {
			const source = `import { type } from "arktype"
const make = type
export const field = (limit: number) => {
	const Field = type(\`string <= \${limit}\`)
	return Field
}`
			attest(
				precompile(source).diagnostics.map(d => `${d.rule} ${d.severity}`)
			).snap(["R4 error", "R1 error"])
			attest(diagnosticsOf(source, {}, { mode: "cache" })).snap([
				"/main.ts:4:16  type(`string <= ${limit}`) cannot be precompiled\n  `limit` is a parameter of field (/main.ts:3:23); its value is known only at runtime\n  Cache mode leaves this to arktype at runtime."
			])
		})
	})
})
