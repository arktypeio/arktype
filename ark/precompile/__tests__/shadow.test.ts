import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
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

// what each driver observes alike, where no site diverges
const agreed = (observed: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(observed).filter(
			([k]) => !["created", "listed", "unbaked", "reported"].includes(k)
		)
	)

const diverged = (): Record<string, string> & { reported: string[] } =>
	JSON.parse(
		spawnSync(process.execPath, ["--conditions", "ark-ts", "diverging.ts"], {
			cwd: shadowed,
			encoding: "utf8"
		}).stdout
	)

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
import { shadow as $arkshadow } from "@ark/precompile/shadow"
import { type } from "arktype"
import { f5gsbk00dbcwma as $arkf5gsbk00dbcwma } from "~arktype/pl1m3k0k49xra"
import { f16onama10v7ypw as $arkf16onama10v7ypw } from "~arktype/pl1m3k0k49xra"
import { Name } from "./name.ts"
import { withId } from "./id.ts"
export function nullable() {
	return $arkshadow("/main.ts:5:9  User.or(\\"null\\")", $arkf5gsbk00dbcwma, ($arkh0) => ($arkh0.or("null")), [], User, Name, $arkm)
}
const User = $arkshadow("/main.ts:7:14  withId(type({ name: Name })).pipe(user => user.name)", $arkf16onama10v7ypw, ($arkh0, $arkh1) => (withId(type({ name: $arkh0 })).pipe($arkh1)), [1], Name, user => user.name, withId)
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
			// a library, which no driver precompiles
			mkdirSync(join(shadowed, "node_modules", "listing"), { recursive: true })
			writeFileSync(
				join(shadowed, "node_modules", "listing", "package.json"),
				JSON.stringify({
					name: "listing",
					type: "module",
					exports: "./index.js"
				})
			)
			writeFileSync(
				join(shadowed, "node_modules", "listing", "index.js"),
				"export const listOf = t => t.array()\nexport const jsonOf = t => t.json\n"
			)
			plain = JSON.parse(run())
			printed = run({ shadow: true })
			shadow = JSON.parse(printed)
		})

		it("returns what arktype returns, calling the program's functions as often, where each validator agrees", () => {
			attest(agreed(shadow)).equals(agreed(plain))
		})

		it("throws naming a site whose validator throws at creation", () => {
			attest(shadow.created).snap(
				'Error: created.ts:5:21  type("string").narrow(isLong) diverges from arktype at creation: arktype gives {"meta":{}}, its validator {"threw":"Error: `isLong` (created.ts:5:43) is a function of 2 or more parameters, but was precompiled as a function of 1 parameter"}'
			)
		})

		it("raises each mismatch the program catches where it can't", () => {
			attest(shadow.reported).equals([
				shadow.created,
				shadow.listed,
				shadow.unbaked
			])
		})

		it("throws where a library reads a member its validator lacks", () => {
			attest([shadow.listed, shadow.unbaked]).snap([
				'Error: types.ts:15:23  type({ name: "string" }) diverges from arktype at reading array, since its validator lacks it: arktype gives "function", its validator undefined',
				'Error: types.ts:15:23  type({ name: "string" }) diverges from arktype at json, since its validator doesn\'t bake it: arktype gives {"out":{"required":[{"key":"name","value":"string"}],"domain":"object"}}, its validator {"threw":"Error: json isn\'t in the build\'s introspection option"}'
			])
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
				vitest.state.getFiles().length,
				// each mismatch observe() catches, which Vitest reports beside the test
				vitest.state.getUnhandledErrors().length
			]).equals([0, 1, 3])
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

	describe("a validator that diverges", () => {
		let outcomes: Record<string, string> & { reported: string[] }

		before(function () {
			this.timeout(60000)
			outcomes = diverged()
		})

		it("validating", () => {
			attest(outcomes.validated).snap(
				'Error: validated diverges from arktype at call(2): arktype gives {"out":2}, its validator {"issues":[{"code":"predicate","path":[],"data":2}]}'
			)
		})

		it("calling a function the program passed otherwise", () => {
			attest(outcomes.called).snap(
				'Error: called diverges from arktype at call("abc"): arktype gives calls isA("abc"), its validator calls isA("abc!")'
			)
		})

		it("calling a function the program passed with another ctx", () => {
			attest(outcomes.checked).snap(
				'Error: checked diverges from arktype at call("abc"): arktype gives calls isFirst("abc", ctx {"path":[],"errorCount":0,"errors":[],"data":"abc"}), its validator calls isFirst("abc", ctx {"path":[],"errorCount":1,"errors":[["predicate"]],"data":"abc"})'
			)
		})

		it("caught by the program, and raised again where it can't be", () => {
			const { reported, swallowed, ...thrown } = outcomes
			attest(swallowed).equals("fallback")
			attest(reported.slice(0, -1)).equals(Object.values(thrown))
			attest(reported[reported.length - 1]).snap(
				'Error: validated diverges from arktype at assert(2): arktype gives {"out":2}, its validator {"threw":"TraversalError","issues":[{"code":"predicate","path":[],"data":2}]}'
			)
		})

		it("sharing an object arktype's output doesn't", () => {
			attest(outcomes.shared).snap(
				'Error: shared diverges from arktype at call({}), the input as arktype\'s morphs left it, though each prints alike: arktype gives {"out":{"a":{},"b":{}},"input":{}}, its validator {"out":{"a":{},"b":{}},"input":{}}'
			)
		})

		it("in a type.fn", () => {
			attest(outcomes.length).snap(
				'Error: length diverges from arktype at call(["abc"]), the input as arktype\'s morphs left it: arktype gives {"out":3,"input":["abc"]}, its validator {"out":4,"input":["abc"]}'
			)
		})

		it("passing a function the program passed one object where arktype passes two", () => {
			attest(outcomes.aliased).snap(
				'Error: aliased diverges from arktype at call({}), the input as arktype\'s morphs left it, though each prints alike: arktype gives calls isSame({"a":{},"b":{}}), its validator calls isSame({"a":{},"b":{}})'
			)
		})

		it("calling a function the program passed with another ctx.root", () => {
			attest(outcomes.rooted).snap(
				'Error: rooted diverges from arktype at call({"a":"x"}): arktype gives calls isFlagged("x", ctx {"path":["a"],"errorCount":0,"errors":[],"data":"x"}), its validator calls isFlagged("x", ctx {"path":["a"],"errorCount":0,"errors":[],"data":"x"}) with another ctx.root'
			)
		})

		it("after arktype's morph wrote an input it can't copy", () => {
			attest(outcomes.bumped).snap(
				'Error: bumped diverges from arktype at call(Counter), the input as arktype\'s morphs left it, which its validator received too, since it can\'t be copied: arktype gives {"out":2}, its validator {"out":4}'
			)
		})
	})
})
