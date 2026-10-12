import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"
import { startVitest } from "vitest/node"
import { precompile } from "./utils.ts"

const shadowed = fromHere("shadowed")

const run = (opts?: object) =>
	spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			...(opts ?
				[
					"--import",
					`data:text/javascript,import { register } from "${pathToFileURL(fromHere("..", "node.ts"))}"; register(${JSON.stringify({ ...opts, conditions: ["ark-ts"], cwd: shadowed })})`
				]
			:	[]),
			"main.ts"
		],
		{ cwd: shadowed, encoding: "utf8" }
	).stdout

contextualize(() => {
	it("passes each hole once to arktype, and to its factory with what it checks", () => {
		attest(
			precompile(
				`import { type } from "arktype"
import { Name } from "./name.ts"
import { withId } from "./id.ts"
export function nullable() {
	return User.or("null")
}
const User = withId(type({ name: Name })).pipe(user => user.name)`,
				{
					"/name.ts": `import { type } from "arktype"
export const Name = type("string").pipe(s => s.trim())`,
					"/id.ts": `import { type } from "arktype"
export const withId = <t extends object>(t: type.Any<t>) => t.and({ id: "string" })`
				},
				{ shadow: true, checkHelpers: true }
			).code
		).snap(`var $arkm = 0;
import "arktype/internal/shadowEntry.js"
import { shadow as $arkshadow } from "@ark/precompile/shadow"
import { type } from "arktype"
import { f5gsbk00dbcwma as $arkf5gsbk00dbcwma } from "~arktype/gkogmu1l2znr8"
import { f16onama10v7ypw as $arkf16onama10v7ypw } from "~arktype/gkogmu1l2znr8"
import { Name } from "./name.ts"
import { withId } from "./id.ts"
export function nullable() {
	return $arkshadow("/main.ts:5:9  User.or(\\"null\\")", $arkf5gsbk00dbcwma, ($arkh0) => ($arkh0.or("null")), User, Name, $arkm)
}
const User = $arkshadow("/main.ts:7:14  withId(type({ name: Name })).pipe(user => user.name)", $arkf16onama10v7ypw, ($arkh0, $arkh1) => (withId(type({ name: $arkh0 })).pipe($arkh1)), Name, user => user.name, withId)
$arkm = 5;
Object.assign((globalThis[Symbol.for("arktype.helpers")] ??= { __proto__: null }), { "/main.ts": { __proto__: null, "nullable": nullable } })`)
	})

	describe("a program", () => {
		let plain: Record<string, unknown>
		// what the Node driver prints, which the other drivers must observe too
		let printed: string
		let shadow: Record<string, unknown>

		before(function () {
			this.timeout(60000)
			plain = JSON.parse(run())
			printed = run({ shadow: true })
			shadow = JSON.parse(printed)
		})

		it("returns arktype's own result where its validator agrees", () => {
			attest([shadow.trimmed, shadow.standard, shadow.errors]).equals([
				plain.trimmed,
				plain.standard,
				true
			])
		})

		it("passes a Type without morphs the input itself, as a class instance a copy would lose", () => {
			attest(shadow.located).equals(true)
		})

		it("evaluates each hole once", () => {
			attest(shadow.morphs).equals(1)
		})

		it("passes a Type an input holds to its factory as its validator", () => {
			attest(shadow.contact).equals(plain.contact)
		})

		it("throws arktype's ParseError for a definition that throws", () => {
			attest(shadow.parseError).equals(plain.parseError)
		})

		it("Scopes and Modules", () => {
			attest([shadow.ids, shadow.user]).equals([plain.ids, plain.user])
		})

		it("a site in a function", () => {
			attest(shadow.tagged).equals(plain.tagged)
		})

		it("throws naming a site whose validator validates otherwise", () => {
			attest(shadow.diverged).snap(
				'Error: diverging.ts:6:22  type("object").narrow(o => { if (accepted.has(o)) return fa… diverges from arktype at call({}): arktype gives {"out":{},"isInput":true}, its validator {"summary":"must be valid according to an anonymous predicate (was {})","issues":[{"code":"predicate","path":[],"data":{},"expected":"valid according to an anonymous predicate","actual":"{}","problem":"must be valid according to an anonymous predicate (was {})","message":"must be valid according to an anonymous predicate (was {})"}]}'
			)
		})

		it("compares each call of a type.fn", () => {
			attest(shadow.length).snap(
				'Error: observe.ts:28:16  type.fn("string", ":", "number")(s => s.length + lengthCall… diverges from arktype at call(["abc"]): arktype gives {"out":3,"isInput":false}, its validator {"out":4,"isInput":false}'
			)
		})

		it("says a morph wrote an input it couldn't copy where its validator disagrees", () => {
			attest(shadow.uncopied).snap(
				'Error: observe.ts:35:21  type({ count: "number" }).pipe(counter => ++counter.count) can\'t be compared with arktype at call(Counter), since its validator received the input as arktype\'s morphs left it, which it can\'t copy: arktype gives {"out":2,"isInput":false}, its validator {"out":3,"isInput":false}'
			)
		})

		it("throws naming a site whose validator throws at creation", () => {
			attest(shadow.created).snap(
				'Error: created.ts:5:21  type("string").narrow(isLong) diverges from arktype at creation: arktype gives {"created":true}, its validator {"threw":"Error: `isLong` (created.ts:5:43) is a function of 2 or more parameters, but was precompiled as a function of 1 parameter"}'
			)
		})

		it("Vitest, configured as the README shows", async () => {
			const vitest = await startVitest([], {
				root: shadowed,
				// Node imports the config, as it imports the plugin's source in this repo
				configLoader: "native",
				watch: false,
				reporters: [],
				env: { EXPECTED: printed }
			})
			await vitest.close()
			attest([
				vitest.state.getCountOfFailedTests(),
				vitest.state.getFiles().length
			]).equals([0, 1])
		}).timeout(60000)

		it("Bun", function () {
			// Bun is optional, so this runs where it is installed
			if (spawnSync("bun", ["--version"]).status !== 0) this.skip()
			const { stdout } = spawnSync(
				"bun",
				["--conditions", "ark-ts", "--preload", "./preload.ts", "main.ts"],
				{ cwd: shadowed, encoding: "utf8" }
			)
			attest(stdout).equals(printed)
		}).timeout(60000)
	})
})
