import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"
import { startVitest } from "vitest/node"
import { lacks, testedOptions } from "./contract.ts"
import {
	hasBun,
	normalized,
	packageFiles,
	precompile,
	writeFixture
} from "./utils.ts"

const shadowed = fromHere("shadowed")

// observe.ts catches a ParseError it creates on purpose
const run = (opts?: object) =>
	spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			...(opts ?
				[
					"--import",
					`data:text/javascript,import { register } from "${pathToFileURL(fromHere("..", "node.ts"))}"; register(${JSON.stringify({ ...opts, allowUnsafe: true, conditions: ["ark-ts"], cwd: shadowed })})`
				]
			:	[]),
			"main.ts"
		],
		{ cwd: shadowed, encoding: "utf8" }
	).stdout

// each library read in observe.ts by the member a build can drop
const libraryReads = {
	standard: "~standard",
	keywordMeta: "meta",
	asserted: "assert"
}

// what the program reads past its validator, in order, for shadow to raise
const divergent = [
	...(lacks("~standard") ? ["standard"] : []),
	"created",
	"listed",
	"unbaked",
	"keywordMeta",
	...(lacks("assert") ? ["asserted"] : [])
]

// what each driver observes alike, where no site diverges
const agreed = (observed: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(observed).filter(
			([k]) => !divergent.includes(k) && k !== "reported"
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
	it("passes each hole once", () => {
		attest(
			normalized(
				precompile(
					`import { type } from "arktype"
import { Name } from "./name.ts"
export function nullable() {
	return User.or("null")
}
const User = type({ name: Name }).pipe(user => user.name)`,
					{
						"/name.ts": `import { type } from "arktype"
export const Name = type("string").pipe(s => s.trim())`
					},
					{ shadow: true, creationChecks: "helpers" }
				).code
			)
		).snap(`var $arkm = 0;
import { shadow as $arkshadow } from "@ark/aot/shadow"
import { type } from "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { Name } from "./name.ts"
export function nullable() {
	return $arkshadow("/main.ts:4:9  User.or(\\"null\\")", $ark#0, ($arkh0) => ($arkh0.or("null")), [], User, Name, $arkm)
}
const User = $arkshadow("/main.ts:6:14  type({ name: Name }).pipe(user => user.name)", $ark#2, ($arkh0, $arkh1) => (type({ name: $arkh0 }).pipe($arkh1)), [1], Name, user => user.name)
$arkm = 4;
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
			writeFixture(
				packageFiles("listing", {
					"index.js":
						'export const listOf = t => t.array()\nexport const jsonOf = t => t.json\nexport const metaOf = t => t.meta\nexport const assertOf = (t, data) => t.assert(data)\nexport const standardOf = (t, data) => t["~standard"].validate(data)\n'
				}),
				shadowed
			)
			plain = JSON.parse(run())
			printed = run({ ...testedOptions, shadow: true })
			shadow = JSON.parse(printed)
		})

		it("returns what arktype returns", () => {
			attest(agreed(shadow)).equals(agreed(plain))
		})

		it("throws naming a site that throws at creation", () => {
			// what arktype creates is compared by meta, unless the validator lacks it
			attest(shadow.created).equals(
				`Error: created.ts:5:21  type("string").narrow(isLong) diverges from arktype at creation: arktype gives ${lacks("meta") ? "{}" : '{"meta":{}}'}, its validator {"threw":"Error: \`isLong\` (created.ts:5:43) is a function of 2 or more parameters, but was precompiled as a function of 1 parameter"}`
			)
		})

		it("raises each mismatch the program catches where it can't", () => {
			attest(shadow.reported).equals(divergent.map(k => shadow[k]))
		})

		it("compares a first-issue validator", () => {
			const first = JSON.parse(
				run({ ...testedOptions, errors: "first", shadow: true })
			)
			attest(agreed(first)).equals(agreed(plain))
			attest(first.reported).equals(divergent.map(k => first[k]))
		}).timeout(60000)

		it("throws reading a member a validator lacks", () => {
			attest([shadow.listed, shadow.unbaked]).snap([
				'Error: types.ts:15:23  type({ name: "string" }) diverges from arktype at reading array, since its validator lacks it: arktype gives "function", its validator undefined',
				'Error: types.ts:15:23  type({ name: "string" }) diverges from arktype at json, since its validator doesn\'t bake it: arktype gives {"out":{"required":[{"key":"name","value":"string"}],"domain":"object"}}, its validator {"out":"undefined"}'
			])
		})

		it("throws reading a keyword's meta", function () {
			if (lacks("meta")) this.skip()
			attest(shadow.keywordMeta).snap(
				'Error: types.ts:5:22  type("string.email") diverges from arktype at meta, since its validator doesn\'t bake a keyword\'s: arktype gives {"format":"email"}, its validator {}'
			)
		})

		it("throws reading members the tested options drop", () => {
			for (const [k, member] of Object.entries(libraryReads)) {
				attest(
					String(shadow[k]).includes(
						`at reading ${member}, since its validator lacks it`
					)
				).equals(lacks(member))
			}
		})

		it("Vitest", async () => {
			const { exitCode } = process
			const vitest = await startVitest([], {
				root: shadowed,
				// Node imports the config, as it imports the plugin's source in this repo
				configLoader: "native",
				watch: false,
				reporters: [],
				env: { EXPECTED: printed }
			})
			await vitest.close()
			// Vitest fails the process for the unhandled errors expected here
			process.exitCode = exitCode
			attest([
				vitest.state.getCountOfFailedTests(),
				vitest.state.getFiles().length,
				// each mismatch observe() catches, which Vitest reports beside the test
				vitest.state.getUnhandledErrors().length
			]).equals([0, 1, divergent.length])
		}).timeout(60000)

		it("Bun", function () {
			if (!hasBun()) this.skip()
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

		it("throws naming where, or raises again what's caught", () => {
			const { reported, swallowed, reordered, ...thrown } = outcomes
			attest(thrown).snap({
				unparsed:
					'Error: unparsed diverges from arktype at creation: arktype gives {"threw":"ParseError: Left bounds are only valid when paired with right bounds (try ...>0)"}, its validator {}',
				validated:
					'Error: validated diverges from arktype at call(2): arktype gives {"out":2}, its validator {"issues":[{"code":"predicate","path":[],"data":2}]}',
				called:
					'Error: called diverges from arktype at call("abc"): arktype gives calls isA("abc"), its validator calls isA("abc!")',
				checked:
					'Error: checked diverges from arktype at call("abc"): arktype gives calls isFirst("abc", ctx {"path":[],"errorCount":0,"errors":[],"data":"abc"}), its validator calls isFirst("abc", ctx {"path":[],"errorCount":1,"errors":[["predicate"]],"data":"abc"})',
				shared:
					'Error: shared diverges from arktype at call({}), the input as arktype\'s morphs left it, though each prints alike: arktype gives {"out":{"a":{},"b":{}},"input":{}}, its validator {"out":{"a":{},"b":{}},"input":{}}',
				length:
					'Error: length diverges from arktype at call(["abc"]), the input as arktype\'s morphs left it: arktype gives {"out":3,"input":["abc"]}, its validator {"out":4,"input":["abc"]}',
				bumped:
					'Error: bumped diverges from arktype at call(Counter), the input as arktype\'s morphs left it, which its validator received too, since it can\'t be copied: arktype gives {"out":2}, its validator {"out":4}',
				aliased:
					'Error: aliased diverges from arktype at call({}), the input as arktype\'s morphs left it, though each prints alike: arktype gives calls isSame({"a":{},"b":{}}), its validator calls isSame({"a":{},"b":{}})',
				rooted:
					'Error: rooted diverges from arktype at call({"a":"x"}): arktype gives calls isFlagged("x", ctx {"path":["a"],"errorCount":0,"errors":[],"data":"x"}), its validator calls isFlagged("x", ctx {"path":["a"],"errorCount":0,"errors":[],"data":"x"}) with another ctx.root'
			})
			attest(swallowed).equals("fallback")
			attest(reported.slice(0, -1)).equals(Object.values(thrown))
			attest(reported[reported.length - 1]).snap(
				'Error: validated diverges from arktype at assert(2): arktype gives {"out":2}, its validator {"threw":"TraversalError","issues":[{"code":"predicate","path":[],"data":2}]}'
			)
		})

		it("not where a first-issue validator finds another issue", () => {
			attest(outcomes.reordered).snap("a[0] must be a string (was a number)")
		})
	})
})
