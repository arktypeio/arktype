// a build either refuses a generated app or runs it as arktype does, whatever
// its narrows read: module state, `let`, regexes holding where they matched,
// functions read as values, the same text over different bindings in two
// modules, and a module run twice. Each module's `check` is one of `reads`,
// reaching a validator through one of `wrappers`. Observes each result, what
// the call did to its input, and each predicate call in order.
// ARK_CELLS_FUZZ=<count>[:<seed>]|twins|probes[:<prefix>]|catalog[:<wrapper>[:static|dynamic|query]]
// [ARK_CELLS_FUZZ_HOSTS=esbuild,esbuild:smallest,split,split:smallest,vite,vite:smallest,chunks,chunks:smallest,modules,webpack,webpack:smallest,rspack,rspack:smallest,node,dev,emit]
// [ARK_CELLS_FUZZ_FAILURES=<dir>] pnpm testCellsFuzz
import { fromHere } from "@ark/fs"
import { precompile } from "@ark/aot/unplugin"
import { rspack } from "@rspack/core"
import { build as esbuild } from "esbuild"
import fc from "fast-check"
import { build as viteBuild, defaultClientConditions } from "vite"
import webpack from "webpack"
import { spawnSync } from "node:child_process"
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import { documented, probes } from "./cellsProbes.ts"
import { throughArkBarrel } from "./arkBarrel.ts"
import { tempDir } from "./utils.ts"

const [countArg, seedArg, importingArg] = (
	process.env.ARK_CELLS_FUZZ ?? "10"
).split(":")
const failureDir =
	process.env.ARK_CELLS_FUZZ_FAILURES ??
	join(tmpdir(), "ark-cells-fuzz-failures")
const hosts = (
	process.env.ARK_CELLS_FUZZ_HOSTS ??
	"esbuild,esbuild:smallest,split,split:smallest,vite,vite:smallest,chunks,chunks:smallest,modules,webpack,webpack:smallest,rspack,rspack:smallest,node,dev,emit"
).split(",")

// each is a module's `check`, % being the module's own number: the text of two
// modules' checks is the same where only what they read differs
const fixedReads: Record<string, string> = {
	// what two runs can't differ in
	literal: `const limit = %\nconst check = (s: string) => s.length > limit`,
	inlined: `const check = (s: string) => s.length > %`,
	computed: `const limit = % * 2 - 1\nconst check = (s: string) => s.length > limit`,
	declared: `function check(s: string) {\n\treturn s.length > %\n}`,
	otherModule: `import { LIM } from "./lim%.ts"\nconst check = (s: string) => s.length > LIM`,
	reexported: `import { RENAMED as limit } from "./relay.ts"\nconst check = (s: string) => s.length > limit`,
	defaultImport: `import limit from "./shared.ts"\nconst check = (s: string) => s.length > limit`,
	sharedFunction: `import { pure as check } from "./shared.ts"`,
	calledFunction: `const isLong = (s: string) => s.length > %\nconst check = (s: string) => isLong(s)`,
	callsAcross: `import { pure } from "./shared.ts"\nconst check = (s: string) => pure(s) && s.length > %`,
	mutual: `function even(n: number): boolean {\n\treturn n === 0 || odd(n - 1)\n}\nfunction odd(n: number): boolean {\n\treturn n !== 0 && even(n - 1)\n}\nconst check = (s: string) => odd(s.length + %)`,
	fixedRegex: `const pattern = /a{%}/\nconst check = (s: string) => pattern.test(s)`,
	fixedList: `const allowed = ["abc", "a".repeat(%)]\nconst check = (s: string) => allowed.includes(s)`,
	fixedSet: `const allowed = new Set(["abc", "a".repeat(%)])\nconst check = (s: string) => allowed.has(s)`,
	fixedTable: `const table = { a: new Set(["abc"]), b: %, }\nconst check = (s: string) => table.a.has(s) || s.length === table.b`,
	globals: `const check = (s: string) => Math.max(s.length, %) > 1 && JSON.stringify(s).length > 2`,
	countsGlobally: `const check = (s: string) => {\n\t;(globalThis as any).calls.push(\`%:\${s}\`)\n\treturn s.length > %\n}`,
	readsType: `const Inner = type("string").narrow(s => s.length > %)\nconst check = (s: string) => Inner.allows(s)`,
	blockLocal: `const check = (s: string) => {\n\tconst limit = %\n\t{\n\t\tconst limit = 1\n\t\tif (s.length === limit) return false\n\t}\n\treturn s.length > limit\n}`,
	tdz: `const check = (s: string) => s.length > late\nconst late = %`
}

// state: a run's own, which a second run can't share. A difference in how often
// a narrow runs shows in these too
const statefulReads: Record<string, string> = {
	letCounter: `let calls = 0\nconst check = (s: string) => ++calls % 2 === 0 || s.length > %`,
	letLimit: `let limit = %\nconst check = (s: string) => s.length > limit++`,
	letSetLater: `let limit = 0\nconst check = (s: string) => s.length > limit\nlimit = %`,
	varCounter: `var calls = 0\nconst check = (s: string) => ++calls % 2 === 0 || s.length > %`,
	objectCounter: `const state = { n: 0 }\nconst check = (s: string) => ++state.n % 2 === 0 || s.length > %`,
	aliasedCounter: `const state = { n: 0 }\nconst alias = state\nconst check = (s: string) => ++alias.n % 2 === 0`,
	destructuredCounter: `const { inner } = { inner: { n: 0 } }\nconst check = (s: string) => ++inner.n % 2 === 0`,
	elementCounter: `const [box] = [{ n: 0 }]\nconst check = (s: string) => ++box.n % 2 === 0`,
	nestedCounter: `const table = { a: { n: 0 } }\nconst check = (s: string) => ++table.a.n % 2 === 0`,
	computedCounter: `const table = { a: { n: 0 } }\nconst key = "a"\nconst check = (s: string) => ++table[key].n % 2 === 0`,
	reflectSet: `const state = { n: 0 }\nconst check = (s: string) => Reflect.set(state, "n", state.n + 1) && state.n % 2 === 0`,
	objectAssign: `const state = { n: 0 }\nconst check = (s: string) => Object.assign(state, { n: state.n + 1 }).n % 2 === 0`,
	defineProperty: `const state = { n: 0 }\nconst check = (s: string) => {\n\tObject.defineProperty(state, "n", { value: state.n + 1, writable: true })\n\treturn state.n % 2 === 0\n}`,
	helperWrites: `const state = { n: 0 }\nconst inc = (o: { n: number }) => ++o.n\nconst check = (s: string) => inc(state) % 2 === 0`,
	arrayPush: `const seen: string[] = []\nconst check = (s: string) => seen.push(s) % 2 === 0`,
	arrayLength: `const seen: string[] = []\nconst check = (s: string) => {\n\tseen.length = seen.length + 1\n\treturn seen.length % 2 === 0\n}`,
	setAdd: `const seen = new Set<string>()\nconst check = (s: string) => {\n\tif (seen.has(s)) return false\n\tseen.add(s)\n\treturn true\n}`,
	setClear: `const seen = new Set<string>(["abc"])\nconst check = (s: string) => {\n\tconst had = seen.has(s)\n\tseen.clear()\n\treturn had\n}`,
	setDelete: `const seen = new Set<string>(["abc"])\nconst check = (s: string) => seen.delete(s)`,
	mapSet: `const counts = new Map<string, number>()\nconst check = (s: string) => {\n\tconst n = (counts.get(s) ?? 0) + 1\n\tcounts.set(s, n)\n\treturn n % 2 === 1\n}`,
	setElement: `const o = { n: 0 }\nconst held = new Set([o])\nconst check = (s: string) => {\n\tfor (const e of held) e.n++\n\treturn o.n % 2 === 0\n}`,
	setSpreadElement: `const held = new Set([{ n: 0 }])\nconst check = (s: string) => ++[...held][0].n % 2 === 0`,
	setForEach: `const held = new Set([{ n: 0 }])\nlet last = 0\nconst check = (s: string) => {\n\theld.forEach(e => (last = ++e.n))\n\treturn last % 2 === 0\n}`,
	mapValue: `const held = new Map([["k", { n: 0 }]])\nconst check = (s: string) => ++held.get("k")!.n % 2 === 0`,
	mapIterator: `const held = new Map([["k", { n: 0 }]])\nconst check = (s: string) => ++held.values().next().value!.n % 2 === 0`,
	objectValues: `const table = { a: { n: 0 } }\nconst check = (s: string) => ++Object.values(table)[0].n % 2 === 0`,
	arrayFrom: `const held = new Set([{ n: 0 }])\nconst check = (s: string) => ++Array.from(held)[0].n % 2 === 0`,
	findElement: `const items = [{ n: 0 }]\nconst check = (s: string) => ++items.find(e => e.n >= 0)!.n % 2 === 0`,
	spreadCopy: `const items = [{ n: 0 }]\nconst check = (s: string) => ++[...items][0].n % 2 === 0`,
	sharedBox: `import { box } from "./shared.ts"\nconst check = (s: string) => ++box.n % 2 === 0`,
	sharedStateful: `import { stateful as check } from "./shared.ts"`,
	sharedLet: `import { count, bump } from "./shared.ts"\nconst check = (s: string) => bump() % 2 === 0 && count > %`,
	writtenElsewhere: `import { list } from "./shared.ts"\nconst check = (s: string) => list.length > 1 && s.length > %`,
	nestedWrittenElsewhere: `import { nested } from "./shared.ts"\nconst check = (s: string) => nested.a.n > 0 && s.length > %`,
	namespaceRead: `import * as ns from "./shared.ts"\nconst check = (s: string) => s.length > ns.MAX`,
	exportedThenWritten: `export const state = { n: % }\nconst check = (s: string) => s.length > state.n\nexport const write = () => ++state.n\nwrite()`,
	escapes: `const state = { n: 0 }\n;(globalThis as any).sink = state\nconst check = (s: string) => ++state.n % 2 === 0`,
	selfProperty: `function check(s: string): boolean {\n\tcheck.calls = (check.calls ?? 0) + 1\n\treturn check.calls % 2 === 0\n}\ncheck.calls = 0`,
	classState: `class Counter {\n\tstatic n = 0\n}\nconst check = (s: string) => ++Counter.n % 2 === 0`,
	closureState: `const check = (() => {\n\tlet n = 0\n\treturn (s: string) => ++n % 2 === 0\n})()`,
	factory: `const longer = (min: number) => (s: string) => s.length > min\nconst check = longer(%)`,
	moduleRun: `const limit = ((globalThis as any).run = ((globalThis as any).run ?? 0) + 1)\nconst check = (s: string) => s.length > limit`,
	moduleMeta: `const check = (s: string) => s.length > 1 && import.meta.url.includes("?v=2")`,
	dateRun: `const start = Date.now()\nconst check = (s: string) => start > 0 && s.length > %`,
	globalRegex: `const pattern = /a/g\nconst check = (s: string) => pattern.test(s)`,
	stickyRegex: `const pattern = /a/y\nconst check = (s: string) => pattern.test(s)`,
	aliasedRegex: `const pattern = /a/g\nconst alias = pattern\nconst check = (s: string) => alias.test(s)`,
	regexInList: `const patterns = [/a/g]\nconst check = (s: string) => patterns[0].test(s)`,
	regexInObject: `const patterns = { a: /a/g }\nconst check = (s: string) => patterns.a.test(s)`,
	regexConstructed: `const pattern = new RegExp("a", "g")\nconst check = (s: string) => pattern.test(s)`,
	regexConditional: `const pattern = % > 0 ? /a/g : /a/\nconst check = (s: string) => pattern.test(s)`,
	regexLastIndex: `const pattern = /a/\nconst check = (s: string) => {\n\tpattern.lastIndex = 1\n\treturn pattern.test(s)\n}`,
	regexCompile: `const pattern = /a/\nconst check = (s: string) => {\n\t;(pattern as any).compile("b")\n\treturn pattern.test(s)\n}`,
	regexSharedGlobal: `import { globalRe } from "./shared.ts"\nconst check = (s: string) => globalRe.test(s)`,
	regexMatchAll: `const pattern = /a/g\nconst check = (s: string) => [...s.matchAll(pattern)].length > 0`,
	regexExec: `const pattern = /a/g\nconst check = (s: string) => !!pattern.exec(s)`,
	regexShared: `import { re } from "./shared.ts"\nconst check = (s: string) => re.test(s)`,
	method: `const helpers = {\n\tn: 0,\n\tbump() {\n\t\treturn ++this.n\n\t}\n}\nconst check = (s: string) => helpers.bump() % 2 === 0`,
	objectToString: `const held = { n: 0, toString: () => "x" }\nconst check = (s: string) => \`\${held}\`.length > 0 && ++held.n % 2 === 0`
}

const pureReads: Record<string, string> = {
	regexLiteralInCall: `const check = (s: string) => /a/g.test(s)`,

	// a function read as a value
	everyHelper: `const isLong = (s: string) => s.length > %\nconst check = (s: string) => [s].every(isLong)`,
	selfCompare: `const check = (s: string): boolean => ((globalThis as any).seen ??= check) === check && s.length > %`,
	helperIdentity: `const helper = () => {}\nconst check = (s: string) => ((globalThis as any).seen ??= helper) === helper`,
	helperLength: `const helper = (a: unknown) => a\nconst check = (s: string) => helper.length + s.length > 2`,
	helperText: `const helper = () => %\nconst check = (s: string) => helper.toString().includes("1")`,
	helperCall: `const helper = (s: string) => s.length > %\nconst check = (s: string) => helper.call(null, s)`,
	helperApply: `const helper = (s: string) => s.length > %\nconst check = (s: string) => helper.apply(null, [s])`,
	helperBind: `const helper = (s: string) => s.length > %\nconst check = (s: string) => helper.bind(null)(s)`,
	helperOptional: `const helper = (s: string) => s.length > %\nconst check = (s: string) => helper?.(s)`,
	helperSequence: `const helper = (s: string) => s.length > %\nconst check = (s: string) => (0, helper)(s)`,
	helperNew: `function Helper(this: any, s: string) {\n\tthis.ok = s.length > %\n}\nconst check = (s: string) => new (Helper as any)(s).ok`,
	helperTagged: `const helper = (strings: TemplateStringsArray) => strings.length > 0\nconst check = (s: string) => helper\`x\``,
	helperProperty: `const helper = (s: string) => s.length > %\nhelper.limit = %\nconst check = (s: string) => s.length > helper.limit`,
	reassignedFunction: `function helper(s: string) {\n\treturn s.length > 1\n}\nhelper = (s: string) => s.length > %\nconst check = (s: string) => helper(s)`,
	functionInList: `const helpers = [(s: string) => s.length > %]\nconst check = (s: string) => helpers[0](s)`,
	functionInObject: `const helpers = { a: (s: string) => s.length > % }\nconst check = (s: string) => helpers.a(s)`,

	// what the proof that a narrow reads only its argument rests on
	arguments: `function check(s: string) {\n\treturn arguments.length > 1 && s.length > %\n}`,
	argumentsCtx: `function check(s: string) {\n\treturn arguments[1] ? arguments[1].mustBe("from arguments") : true\n}`,
	arrowArguments: `function check(s: string) {\n\tconst read = () => arguments.length\n\treturn read() > 1\n}`,
	restCtx: `const check = (s: string, ...rest: any[]) => rest.length > 0`,
	restCtxReject: `const check = (...args: any[]) => args[1].reject({ expected: "from rest" })`,
	defaultCtx: `function check(s: string, ctx = arguments[1]) {\n\treturn ctx ? ctx.mustBe("from default") : true\n}`,
	declaredCtx: `const check = (s: string, ctx: any) => s.length > % || ctx.mustBe("long")`,
	ctxPath: `const check = (s: string, ctx: any) => ctx.path.length === 0 || ctx.mustBe(ctx.path.join("."))`,
	ctxLength: `const check = function (s: string, ctx?: any) {\n\treturn check.length > 1 && !!ctx\n}`,
	evalCtx: `const check = function (s: string) {\n\treturn eval("arguments.length") > 1\n}`,
	indirectEval: `const run = eval\nconst check = (s: string) => run("1 + 1") === 2 && s.length > %`,
	newFunction: `const check = new Function("s", "ctx", "return !!ctx") as (s: string) => boolean`,
	thisRead: `function check(this: unknown, s: string) {\n\treturn this === undefined\n}`,
	thisType: `function check(this: unknown, s: string) {\n\t;(globalThis as any).calls.push(typeof this)\n\treturn true\n}`,
	newTarget: `function check(s: string) {\n\treturn new.target === undefined\n}`,
	reference: `const check = function self(s: string): boolean {\n\treturn self.length === 1 && s.length > %\n}`,
	generator: `function* check(s: string) {\n\tyield s\n}`,
	async: `const check = async (s: string) => s.length > 99`,
	returnsZero: `const check = (s: string) => (s.length > % ? 1 : 0)`,
	returnsEmpty: `const check = (s: string) => (s.length > % ? "yes" : "")`,
	returnsNothing: `const check = (s: string) => {\n\tif (s.length > %) return true\n}`,
	returnsNaN: `const check = (s: string) => (s.length > % ? 1 : NaN)`,
	returnsNull: `const check = (s: string) => (s.length > % ? {} : null)`,
	throws: `const check = (s: string) => {\n\tif (s.length > %) throw new Error("too long")\n\treturn true\n}`,
	throwsValue: `const check = (s: string) => {\n\tif (s.length === %) throw "a string"\n\treturn true\n}`,
	recursive: `const check = (s: string): boolean => s.length === 0 || check(s.slice(1))`,
	mutatesObject: `const check = (s: any) => {\n\tif (typeof s === "object" && s) s.touched = true\n\treturn true\n}`,
	deletesKey: `const check = (s: any) => {\n\tif (typeof s === "object" && s) delete s.a\n\treturn true\n}`,
	freezes: `const check = (s: any) => {\n\tif (typeof s === "object" && s) Object.freeze(s)\n\treturn true\n}`
}

const reads = { ...fixedReads, ...statefulReads, ...pureReads }

// a Type holding `check`, with what to call it with: `x` is each base value
interface Wrapper {
	def: string
	input: string
	extra?: string[]
}

const closedInputs = [
	`{ a: "abc", extra: 1 }`,
	`{ extra: 1, a: "abc", b: 1 }`,
	`{ a: "abc", b: "no", extra: 1 }`,
	`{ a: "a", extra: 1, more: 2 }`,
	`{ a: "abc", [Symbol.for("s")]: 1 }`,
	`Object.create({ a: "abc", inherited: 1 })`,
	`Object.assign(Object.create({ inherited: 1 }), { a: "abc" })`,
	`JSON.parse('{ "__proto__": 1, "a": "abc" }')`,
	`Object.assign(Object.create(null), { a: "abc", extra: 1 })`,
	`new (class Held { a = "abc"; extra = 1 })()`,
	`new (class Held { a = "abc" })()`,
	`Object.defineProperty({ a: "abc" }, "hidden", { value: 1, enumerable: false })`,
	`Object.defineProperty({ a: "abc" }, "extra", { get: () => 1, enumerable: true })`,
	`Object.freeze({ a: "abc", extra: 1 })`,
	`Object.assign([], { a: "abc" })`,
	`{ a: "abc", extra: undefined }`,
	`{ a: "abc", b: undefined }`
]

const wrappers: Record<string, Wrapper> = {
	narrow: { def: `type("string").narrow(check as any)`, input: "x" },
	called: { def: `type("string").narrow(s => (check as any)(s))`, input: "x" },
	tuple: { def: `type(["string", ":", check as any])`, input: "x" },
	prop: {
		def: `type({ a: type("string").narrow(check as any) })`,
		input: "{ a: x }"
	},
	optional: {
		def: `type({ "a?": ["string", ":", check as any] })`,
		input: "{ a: x }"
	},
	nested: {
		def: `type({ a: { b: type("string").narrow(check as any) } })`,
		input: "{ a: { b: x } }"
	},
	object: {
		def: `type({ a: "string" }).narrow(check as any)`,
		input: "{ a: x }"
	},
	objectRead: {
		def: `type({ a: "string" }).narrow(o => (check as any)(o.a))`,
		input: "{ a: x }"
	},
	union: {
		def: `type("string").narrow(check as any).or("number")`,
		input: "x"
	},
	discriminated: {
		def: `type({ k: "'a'", a: type("string").narrow(check as any) }).or({ k: "'b'" })`,
		input: `{ k: "a", a: x }`
	},
	twice: {
		def: `type("string").narrow(check as any).narrow(check as any)`,
		input: "x"
	},
	piped: {
		def: `type("string").narrow(check as any).pipe(s => s.length)`,
		input: "x"
	},
	afterMorph: { def: `type("string.trim").narrow(check as any)`, input: "x" },
	array: {
		def: `type("string").narrow(check as any).array()`,
		input: "[x, x]"
	},
	indexed: {
		def: `type({ "[string]": type("string").narrow(check as any) })`,
		input: "{ k: x }"
	},
	scoped: {
		def: `scope({ A: ["string", ":", check as any], B: { a: "A" } }).export().B`,
		input: "{ a: x }"
	},
	cyclic: {
		def: `scope({ N: { a: ["string", ":", check as any], "next?": "N" } }).export().N`,
		input: "{ a: x, next: { a: x } }"
	},
	defaulted: {
		def: `type({ "a?": type("string").narrow(check as any) })`,
		input: "{ a: x }",
		extra: ["{}"]
	},
	morphedProp: {
		def: `type({ a: type("string").narrow(check as any), l: type("string").pipe(s => s.length) })`,
		input: `{ a: x, l: "abc" }`
	},
	reject: {
		def: `type({ "+": "reject", a: type("string").narrow(check as any), "b?": "number" })`,
		input: "{ a: x }",
		extra: closedInputs
	},
	delete: {
		def: `type({ "+": "delete", a: type("string").narrow(check as any), "b?": "number" })`,
		input: "{ a: x }",
		extra: closedInputs
	},
	rejectPlain: {
		def: `type({ "+": "reject", a: "string", "b?": "number" })`,
		input: "{ a: x }",
		extra: closedInputs
	},
	deletePlain: {
		def: `type({ "+": "delete", a: "string", "b?": "number" })`,
		input: "{ a: x }",
		extra: closedInputs
	},
	deleteNested: {
		def: `type({ o: { "+": "delete", a: type("string").narrow(check as any) } })`,
		input: "{ o: { a: x, extra: 1 } }"
	},
	deleteMorph: {
		def: `type({ "+": "delete", a: "string", l: type("string").pipe(s => s.length) })`,
		input: `{ a: x, l: "abc", extra: 1 }`
	}
}

const baseValues = [`"abc"`, `""`, `"a"`, `"abcdef"`, `"aaa"`, `5`, `null`]

// each configuration, or none, with whether it's read ahead of the app's sites
const configs: Record<string, string> = {
	none: "",
	delete: `onUndeclaredKey: "delete"`,
	reject: `onUndeclaredKey: "reject"`,
	onFail: "onFail: errors => `failed: ${errors.summary}`",
	nan: "numberAllowsNaN: true"
}

interface AppModule {
	read: string
	wrapper: string
}

interface App {
	modules: AppModule[]
	// how main reaches them: a static import, import(), twice under a query, or
	// statically and then again through a global a build can't read, running a
	// chunk's text again beside the generated chunks it already loaded. A build
	// seeing the import() itself holds no cell, as it can't see the whole program.
	importing: "static" | "dynamic" | "query" | "again"
	writes: boolean
	config: string
	configFirst: boolean
	readsAllows: boolean
	// tallied apart: which Types are one instance differs by host (F2)
	comparesIdentity: boolean
	// each of twinDefinitions created exported in one module, unexported in main
	twins?: true
	// one of cellsProbes' programs, run as written, compared with arktype's own
	// messages too
	probe?: string
}

const readNames = Object.keys(reads)
const wrapperNames = Object.keys(wrappers)

const appModule: fc.Arbitrary<AppModule> = fc.record({
	read: fc.constantFrom(...readNames),
	wrapper: fc.constantFrom(...wrapperNames)
})

const apps: fc.Arbitrary<App> = fc.record({
	// half of them repeat the first module's text but for what % decides
	modules: fc
		.tuple(fc.array(appModule, { minLength: 1, maxLength: 4 }), fc.boolean())
		.map(([modules, repeat]) =>
			repeat ? [modules[0], modules[0], ...modules.slice(1)] : modules
		),
	importing: fc.constantFrom("static", "static", "dynamic", "query"),
	writes: fc.boolean(),
	config: fc.constantFrom("none", "none", "none", ...Object.keys(configs)),
	// a Type created before configure() is refused, which only needs seeing rarely
	configFirst: fc.constantFrom(true, true, true, true, false),
	readsAllows: fc.boolean(),
	comparesIdentity: fc.boolean()
})

const shared = `export const MAX = 2
export const list = ["abc"]
export const nested = { a: { n: 0 } }
export const box = { n: 0 }
export let count = 0
export const bump = () => ++count
export const re = /a/
export const globalRe = /a/g
export const pure = (s: string) => s.length > 2
export const stateful = (s: string) => ++box.n % 2 === 0 && s.length > 1
export default 2
`

// each file of an app, whose imports of arktype reach it through a barrel where
// the round asks
const filesOf = (app: App): Record<string, string> =>
	throughArkBarrel(ownFilesOf(app))

const ownFilesOf = (app: App): Record<string, string> => {
	const files: Record<string, string> = {
		"package.json": `{ "type": "module" }\n`,
		"setup.ts": `;(globalThis as any).calls = []\n`,
		"shared.ts": shared,
		"relay.ts": `export * from "./shared.ts"\nexport { MAX as RENAMED } from "./shared.ts"\n`,
		"writer.ts": `import { list, nested } from "./shared.ts"\n\nlist.push("x")\nnested.a.n = 5\n`,
		"ark.json": JSON.stringify({
			precompile: app.config === "none" ? {} : { config: "config.ts" }
		}),
		"tsconfig.json": JSON.stringify({
			compilerOptions: {
				target: "ES2022",
				module: "NodeNext",
				rewriteRelativeImportExtensions: true,
				strict: false,
				skipLibCheck: true,
				types: [],
				rootDir: ".",
				outDir: "out-emit"
			},
			include: ["*.ts"]
		})
	}
	if (app.probe) return { ...files, ...probes[app.probe] }
	if (app.twins) {
		const names = Object.keys(twinDefinitions)
		files["twin.ts"] = `import { type } from "arktype"
export const double = (d: any) => (typeof d === "number" ? d * 2 : d)
export const positive = (d: number) => d > 0
${names.map(name => `export const ${name} = type(${twinDefinitions[name]})`).join("\n")}
`
	}
	if (app.config !== "none") {
		files["config.ts"] =
			`import { configure } from "arktype/config"\n\nconfigure({ ${configs[app.config]} })\n`
	}
	for (const [i, { read, wrapper }] of app.modules.entries()) {
		const n = i + 1
		files[`lim${n}.ts`] = `export const LIM = ${n}\n`
		const text = reads[read].replace(/%(?! 2\b)/g, String(n))
		// imports first, which everything but a module's own text can't say
		const lines = text.split("\n")
		const imports = lines.filter(line => line.startsWith("import "))
		const body = lines.filter(line => !line.startsWith("import "))
		const { def } = wrappers[wrapper]
		const usesType = def.includes("type(") || text.includes("type(")
		const named = [
			...(def.includes("scope(") ? ["scope"] : []),
			...(usesType ? ["type"] : [])
		]
		files[`m${n}.ts`] =
			`import { ${named.join(", ")} } from "arktype"\n${imports.join("\n")}\n\n${body.join("\n")}\n\nexport const V = ${def}\n`
	}
	const specifiers = (i: number) => {
		const name = `./m${i + 1}.ts`
		return app.importing === "query" ? [`${name}?v=1`, `${name}?v=2`] : [name]
	}
	const imported = app.modules.flatMap((_, i) =>
		specifiers(i).map((specifier, j) => ({
			specifier,
			local: `V${i}_${j}`,
			module: i
		}))
	)
	if (app.importing === "again") {
		for (const [i, _] of app.modules.entries()) {
			imported.push({
				specifier: `again${i}`,
				local: `V${i}_again`,
				module: i
			})
		}
	}
	const imports = imported.map(({ specifier, local, module }) =>
		specifier.startsWith("again") ?
			`const { V: ${local} } = await (globalThis as any).loadAgain("m${module + 1}")`
		: app.importing === "dynamic" ?
			`const { V: ${local} } = await import("${specifier}")`
		:	`import { V as ${local} } from "${specifier}"`
	)
	const configImport = app.config === "none" ? [] : [`import "./config.ts"`]
	const staticImports = [
		`import { type } from "arktype"`,
		`import "./setup.ts"`,
		...(app.configFirst ? configImport : []),
		...(app.writes ? [`import "./writer.ts"`] : []),
		...imports.filter(line => line.startsWith("import ")),
		...(app.configFirst ? [] : configImport)
	]
	const cases = imported.map(({ local, module }) => {
		const { input, extra = [] } = wrappers[app.modules[module].wrapper]
		const values = baseValues.map(value => `(x => (${input}))(${value})`)
		return `[${local}, () => [${[...values, ...values, ...extra].join(", ")}]]`
	})
	const awaited = imports.filter(line => line.startsWith("const "))
	const twinNames = app.twins ? Object.keys(twinDefinitions) : []
	files["main.ts"] = `${staticImports.join("\n")}
${app.twins ? `import { double, positive, ${twinNames.join(", ")} } from "./twin.ts"` : ""}
${awaited.join("\n")}
${twinNames.map(name => `const ${name}Here = type(${twinDefinitions[name]})`).join("\n")}

const { calls } = globalThis as any
const printed = (value: unknown) =>
	JSON.stringify(value, (_, v) =>
		typeof v === "function" ? "function"
		: typeof v === "bigint" ? String(v)
		: v
	)
// what a result is beyond what JSON keeps of it
const shapeOf = (value: any) =>
	value && typeof value === "object" ?
		[
			// a minifier renames a class
			Object.getPrototypeOf(value) === null ? null
			: Object.getPrototypeOf(value) === Object.prototype ? "Object"
			: Array.isArray(value) ? "Array"
			: "instance",
			Reflect.ownKeys(value).map(String)
		]
	:	typeof value
const observe = (validator: any, input: unknown) => {
	calls.length = 0
	let result: unknown
	try {
		const out = validator(input)
		result =
			out instanceof type.errors ?
				{ errors: out.summary }
			:	{ out: printed(out), shape: shapeOf(out), same: out === input }
	} catch (e) {
		result = { threw: String((e as Error)?.message ?? e) }
	}
	return { ...(result as object), input: printed(input), shape: shapeOf(input), calls: [...calls] }
}
const cases: [any, () => unknown[]][] = [${cases.join(",\n")}]
const observations: unknown[] = []
for (const [validator, inputs] of cases) {
	for (const input of inputs()) {
		observations.push(observe(validator, input))${
			app.readsAllows ?
				`
		try {
			observations.push(validator.allows(input))
		} catch (e) {
			observations.push({ threw: String((e as Error)?.message ?? e) })
		}`
			:	""
		}
	}
}${
		app.comparesIdentity ?
			`
const validators = cases.map(([validator]) => validator)
observations.push(new Set(validators).size)
observations.push([...validators.map(v => validators.indexOf(v)), ${twinNames.map(name => `${name}Here === ${name}`).join(", ")}])`
		:	""
	}
console.log(JSON.stringify(observations))
`
	return files
}

// a Type and its unexported twin in another module, which arktype returns as one
const twinDefinitions: Record<string, string> = {
	KeywordMorph: `"string.numeric.parse"`,
	PropMorph: `{ a: "string.numeric.parse" }`,
	ArrayMorph: `"string.numeric.parse[]"`,
	HeldMorph: `["string", "=>", double]`,
	HeldNarrow: `["number", ":", positive]`,
	Keyword: `"string.email"`,
	Plain: `{ a: "string" }`,
	Strings: `"string[]"`
}

const sourceOfApp = (app: App) => {
	const files = filesOf(app)
	return ["main.ts", ...Object.keys(files).filter(name => /^m\d/.test(name))]
		.map(name => `--- ${name}\n${files[name]}`)
		.join("\n")
}

const root = tempDir("ark-cells-fuzz-")
let appCount = 0

const writeApp = (app: App): string => {
	const dir = join(root, `${appCount++}`)
	mkdirSync(join(dir, "node_modules"), { recursive: true })
	symlinkSync(
		fromHere("..", "..", "type"),
		join(dir, "node_modules", "arktype")
	)
	const files = filesOf(app)
	for (const name in files) {
		mkdirSync(dirname(join(dir, name)), { recursive: true })
		writeFileSync(join(dir, name), files[name])
	}
	return dir
}

const conditions = ["ark-ts", "production"]

// what an app's main runs a chunk again through, knowing only its own path
const loadAgain = `data:text/javascript,globalThis.loadAgain = name => import(new URL("./" + name + (process.argv[1].endsWith(".ts") ? ".ts" : ".js") + "?again", "file://" + process.argv[1]))`

const run = (args: string[], cwd: string, env: Record<string, string> = {}) => {
	const { stdout, stderr, status } = spawnSync(process.execPath, args, {
		cwd,
		encoding: "utf8",
		timeout: 120_000,
		env: { ...process.env, ...env }
	})
	return status === 0 ? stdout : `exit ${status}\n${stdout}\n${stderr}`
}

const runBundle = (file: string, dir: string) =>
	run(
		[
			"--import",
			loadAgain,
			"--import",
			"data:text/javascript,for (const event of ['uncaughtException', 'unhandledRejection']) process.on(event, e => { console.error(String(e)); process.exit(1) })",
			file
		],
		dir
	)

type Outcome = { refused: string } | { out: string }

const messageOf = (e: unknown): string =>
	e && typeof e === "object" && "errors" in e && Array.isArray(e.errors) ?
		e.errors
			.map(
				(error: { text?: string; message?: string }) =>
					error.text ?? error.message
			)
			.join("\n")
	:	String((e as Error)?.message ?? e)

const esbuildOutcome = async (
	dir: string,
	label: string,
	{
		prune = true,
		plugin = true,
		splitting = false
	}: { prune?: boolean; plugin?: boolean; splitting?: boolean }
): Promise<Outcome> => {
	const out = join(dir, `out-${label}`)
	try {
		await esbuild({
			entryPoints: [join(dir, "main.ts")],
			absWorkingDir: dir,
			bundle: true,
			format: "esm",
			target: "esnext",
			platform: "node",
			outdir: out,
			splitting,
			minify: true,
			conditions,
			logLevel: "silent",
			plugins:
				plugin ?
					[
						precompile.esbuild({
							conditions,
							cwd: dir,
							...(!prune && { prune: false })
						})
					]
				:	[]
		})
	} catch (e) {
		return { refused: messageOf(e) }
	}
	return { out: runBundle(join(out, "main.js"), dir) }
}

// each generated module and each of the app's a chunk of its own, keeping a cell
// from the function it holds as esbuild's layout never would. Only what's in a
// chunk keeps its place in the imports: a manual chunk loads ahead of what stays
// in the entry, which would run Types before the app's config.
const chunkOf =
	(dir: string) =>
	(id: string): string | undefined => {
		const generated = /~arktype[/\\]([^/?\\]+)/.exec(id)
		if (generated) return `generated-${generated[1]}`
		const own = /[/\\](\w+)\.ts(?:\?v=(\d))?$/.exec(id)
		if (own && id.startsWith(dir) && own[1] !== "main")
			return `${own[1]}${own[2] ?? ""}`
		// so a chunk run again doesn't import the entry that's waiting for it
		return id.endsWith("main.ts") ? undefined : "vendor"
	}

const viteOutcome = async (
	dir: string,
	label: string,
	plugin: boolean,
	chunked = false
): Promise<Outcome> => {
	const out = join(dir, `out-${label}`)
	const { NODE_ENV } = process.env
	process.env.NODE_ENV = "production"
	try {
		await viteBuild({
			root: dir,
			configFile: false,
			logLevel: "silent",
			plugins:
				plugin ? [precompile.vite({ conditions: ["ark-ts"], cwd: dir })] : [],
			resolve: { conditions: ["ark-ts", ...defaultClientConditions] },
			build: {
				write: true,
				outDir: out,
				emptyOutDir: true,
				minify: true,
				target: "esnext",
				...(chunked ?
					{
						// its preload helper reads document, which node lacks
						modulePreload: false as const,
						rolldownOptions: {
							input: join(dir, "main.ts"),
							preserveEntrySignatures: "strict" as const,
							output: {
								entryFileNames: "[name].js",
								chunkFileNames: "[name].js",
								// a chunk run again is read by the name it declares
								minifyInternalExports: false,
								manualChunks: chunkOf(dir)
							}
						}
					}
				:	{
						lib: {
							entry: join(dir, "main.ts"),
							formats: ["es" as const],
							fileName: (_: string, name: string) => `${name}.js`
						}
					})
			}
		})
	} catch (e) {
		return { refused: messageOf(e) }
	} finally {
		if (NODE_ENV === undefined) delete process.env.NODE_ENV
		else process.env.NODE_ENV = NODE_ENV
	}
	return { out: runBundle(join(out, "main.js"), dir) }
}

// webpack and Rspack read arktype's built output, and need a project's loader to
// read a .ts module, as neither strips types itself
const webpackOutcome = async (
	dir: string,
	label: string,
	plugin: boolean,
	bundler: "webpack" | "rspack"
): Promise<Outcome> => {
	const out = join(dir, `out-${label}`)
	const config = {
		mode: "production" as const,
		context: dir,
		entry: "./main.ts",
		target: "node" as const,
		experiments: { topLevelAwait: true },
		output: { path: out, filename: "main.cjs" },
		resolve: { extensions: [".ts", ".js", ".cjs"] },
		module: {
			rules: [{ test: /\.ts$/, loader: fromHere("stripTypesLoader.ts") }]
		}
	}
	const compiler =
		bundler === "webpack" ?
			webpack({
				...config,
				plugins: plugin ? [precompile.webpack({ cwd: dir }) as never] : []
			})
		:	((rspack as (options: unknown) => unknown)({
				...config,
				plugins: plugin ? [precompile.rspack({ cwd: dir })] : []
			}) as webpack.Compiler)
	const errors = await new Promise<string | undefined>((resolve, reject) => {
		const hung = setTimeout(
			() => reject(new Error(`${bundler} hung building ${dir}`)),
			300_000
		)
		compiler.run((error, stats) =>
			compiler.close(() => {
				clearTimeout(hung)
				resolve(
					error ? messageOf(error)
					: stats?.hasErrors() ?
						stats
							.toJson()
							.errors!.map(e => e.message)
							.join("\n")
					:	undefined
				)
			})
		)
	})
	if (errors) return { refused: errors }
	return { out: runBundle(join(out, "main.cjs"), dir) }
}

const driver = (dir: string, production: boolean): Outcome => {
	const out = run(
		[
			"--conditions",
			"ark-ts",
			"--import",
			`data:text/javascript,import { register } from "${pathToFileURL(fromHere("..", "node.ts"))}"; register(${JSON.stringify({ conditions: ["ark-ts"], cwd: dir })})`,
			"main.ts"
		],
		dir,
		{ NODE_ENV: production ? "production" : "development" }
	)
	const refused = /^exit \d+\n\n[\S\s]*?(\S+\.ts:\d+:\d+ {2}[^\n]+)/.exec(out)
	return refused ? { refused: refused[1] } : { out }
}

const tsc = fromHere(
	"..",
	"..",
	"..",
	"node_modules",
	"typescript",
	"bin",
	"tsc"
)

const emitOutcome = (dir: string): Outcome => {
	const emitted = spawnSync(
		process.execPath,
		[tsc, "-p", join(dir, "tsconfig.json"), "--noCheck", "--noResolve"],
		{ cwd: dir, encoding: "utf8", timeout: 120_000 }
	)
	if (emitted.status !== 0)
		return { refused: `harness: tsc failed\n${emitted.stdout}` }
	const cli = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", fromHere("..", "cli.ts"), "--emit"],
		{ cwd: dir, encoding: "utf8", timeout: 120_000 }
	)
	if (cli.status !== 0) return { refused: cli.stderr || cli.stdout }
	return {
		out: run(["--conditions", "ark-ts", join(dir, "out-emit", "main.js")], dir)
	}
}

// builds an app in a host, under the preset its label names
const outcomeOf = (
	host: string,
	dir: string,
	app: App,
	plugin = true
): Promise<Outcome> | Outcome => {
	const [kind, preset] = host.split(":")
	writeFileSync(
		join(dir, "ark.json"),
		JSON.stringify({
			precompile: {
				...(app.config !== "none" && { config: "config.ts" }),
				...(preset && { preset })
			}
		})
	)
	const label = `${host.replace(":", "-")}${plugin ? "" : "-plain"}`
	return (
		kind === "esbuild" ? esbuildOutcome(dir, label, { plugin })
		: kind === "split" ? esbuildOutcome(dir, label, { plugin, splitting: true })
		: kind === "modules" ? esbuildOutcome(dir, label, { plugin, prune: false })
		: kind === "vite" ? viteOutcome(dir, label, plugin)
		: kind === "chunks" ? viteOutcome(dir, label, plugin, true)
		: kind === "webpack" || kind === "rspack" ?
			webpackOutcome(dir, label, plugin, kind)
		: kind === "node" ? driver(dir, true)
		: kind === "dev" ? driver(dir, false)
		: emitOutcome(dir)
	)
}

const bundlers = new Set([
	"esbuild",
	"split",
	"modules",
	"vite",
	"chunks",
	"webpack",
	"rspack"
])

const observationsOf = (out: string): unknown[] | undefined => {
	try {
		return JSON.parse(out)
	} catch {
		return
	}
}

// a build's messages, from which a minifier renames a function
const normalized = (observation: unknown) =>
	JSON.stringify(observation)
		?.replace(/\$ark\.\w+?\$?\d+/g, "$ark.fn")
		.replace(/[\w$]+\.(?=[\w$]+ is not a function)/g, "")
		.replace(/[\w$]+(?= is not iterable)/g, "value")
		.replace(
			/according to (?:an anonymous predicate|[\w$]+)/g,
			"according to a predicate"
		)

// what a build must agree with arktype's source on: what passes, what it
// returns, what's called and what's thrown. Messages it agrees with the whole
// build on, where the two worlds' differ as documented.
const verdictsOf = (observation: unknown): unknown =>
	Array.isArray(observation) ? observation.map(verdictsOf)
	: observation && typeof observation === "object" && "errors" in observation ?
		{ ...observation, errors: true }
	:	observation

// a default build fails what a narrow rejected then accepted, where arktype
// returns it (reported as F1 of launch/fuzz8.md), so only a flip on the data the
// narrow's re-run accepted counts as this
const isFlip = (expected: unknown, observed: unknown) =>
	((observed as { errors?: string })?.errors === "is invalid" ||
		(observed as { out?: string })?.out === '"failed: is invalid"') &&
	!!expected &&
	typeof expected === "object" &&
	"out" in expected

const allFlips = (expected: unknown[], observed: unknown[]) =>
	expected.length === observed.length &&
	expected.every(
		(observation, i) =>
			normalized(verdictsOf(observation)) ===
				normalized(verdictsOf(observed[i])) || isFlip(observation, observed[i])
	)

interface Tally {
	sound: number
	unsound: number
	flips: number
	identities: number
	bundler: number
	refused: Record<string, number>
}

const tallies = Object.fromEntries(
	hosts.map(host => [
		host,
		{ sound: 0, unsound: 0, flips: 0, identities: 0, bundler: 0, refused: {} }
	])
) as Record<string, Tally>
// how often a read reached the bundle as anything but a refusal
const reached: Record<string, number> = {}

const bump = (record: Record<string, number>, key: string) =>
	(record[key] = (record[key] ?? 0) + 1)

const headOf = (message: string) => {
	const lines = message.split("\n").filter(line => line.trim())
	const line = lines.find(
		l =>
			!/^(threw )?Error: Build failed|^\[plugin |^exit \d+$|^(× )?Module build failed|^(ModuleBuildError|Error): Module build failed/.test(
				l.trim()
			)
	)
	return (
		(line ?? lines[0] ?? JSON.stringify(message))
			.replace(/\s+/g, " ")
			// Rspack draws its cause's tree
			.replace(/^[\s×─╰▶]+/, "")
			.replace(/^\S+\.ts(?:\?\S*)?:\d+:\d+ /, "")
			.slice(0, 120)
	)
}

const failures: string[] = []
mkdirSync(failureDir, { recursive: true })

const keepFailure = (
	app: App,
	host: string,
	expected: string,
	out: string
): string => {
	const kept = join(failureDir, `${Date.now()}-${host.replace(":", "-")}`)
	const files = filesOf(app)
	for (const name in files) {
		mkdirSync(dirname(join(kept, name)), { recursive: true })
		writeFileSync(join(kept, name), files[name])
	}
	writeFileSync(join(kept, "expected.txt"), expected)
	writeFileSync(join(kept, "actual.txt"), out)
	failures.push(kept)
	return kept
}

// the first observation a build differs from a reference on
const firstMismatch = (
	expected: unknown[],
	observed: unknown[],
	view: (observation: unknown) => unknown
) => {
	const at = expected.findIndex(
		(observation, i) =>
			normalized(view(observation)) !== normalized(view(observed[i]))
	)
	return at === -1 ?
			`${observed.length} observations for ${expected.length}`
		:	`observation ${at}: expected ${JSON.stringify(expected[at])}, got ${JSON.stringify(observed[at])}`
}

// the error a run of a build crashed with
const errorOf = (out: string) => /^\w*Error\b.*$/m.exec(out)?.[0]

const check = async (app: App): Promise<boolean> => {
	const dir = writeApp(app)
	const expected = run(
		["--conditions", "ark-ts", "--import", loadAgain, join(dir, "main.ts")],
		dir
	)
	const fullExpected = observationsOf(expected)
	if (app.twins)
		console.log(`source: ${JSON.stringify(fullExpected?.slice(-1)[0])}`)
	const withoutIdentity = (observations: unknown[] | undefined) =>
		app.comparesIdentity ? observations?.slice(0, -2) : observations
	const expectedObservations = withoutIdentity(fullExpected)
	const whole = await esbuildOutcome(dir, "whole", { prune: false })
	const wholeObservations = withoutIdentity(
		"out" in whole ? observationsOf(whole.out) : undefined
	)
	let sound = true
	for (const host of hosts) {
		const tally = tallies[host]
		// tsc doesn't rewrite a query
		if (host === "emit" && app.importing === "query") continue
		// only this layout names a chunk main can import again
		if (app.importing === "again" && !host.startsWith("chunks")) continue
		const outcome = await outcomeOf(host, dir, app)
		if ("refused" in outcome) {
			bump(tally.refused, headOf(outcome.refused))
			continue
		}
		const observed = observationsOf(outcome.out)
		const observations =
			app.comparesIdentity && observed ? observed.slice(0, -2) : observed
		if (
			app.comparesIdentity &&
			observed &&
			fullExpected &&
			JSON.stringify(observed.slice(-2)) !==
				JSON.stringify(fullExpected.slice(-2))
		)
			tally.identities++
		if (app.twins && observed)
			console.log(`${host}: ${JSON.stringify(observed.slice(-1)[0])}`)
		// an app crashing whole in arktype must crash in a build, or be refused
		let mismatch =
			!expectedObservations || !observations ?
				!expectedObservations === !observations ?
					undefined
				:	`oracle: ${expected.slice(0, 400)}\nbuild: ${outcome.out.slice(0, 400)}`
			: (
				normalized(verdictsOf(observations)) !==
				normalized(verdictsOf(expectedObservations))
			) ?
				firstMismatch(expectedObservations, observations, verdictsOf)
			:	undefined
		// a probe reads its values whole, as arktype writes them, less what the
		// docs say a standalone validator writes otherwise
		if (app.probe && observations && expectedObservations) {
			mismatch =
				(
					normalized(documented(observations)) !==
					normalized(documented(expectedObservations))
				) ?
					firstMismatch(expectedObservations, observations, documented)
				:	undefined
		}
		if (
			!mismatch &&
			observations &&
			wholeObservations &&
			normalized(observations) !== normalized(wholeObservations)
		)
			mismatch = `message: ${firstMismatch(wholeObservations, observations, o => o)}`

		if (
			mismatch &&
			expectedObservations &&
			observations &&
			allFlips(expectedObservations, observations)
		) {
			tally.flips++
			// F1 is fixed, so a flip is kept to read, though not counted unsound
			console.error(
				`\nFLIP (${host}): kept in ${keepFailure(app, `${host}-flip`, expected, outcome.out)}`
			)
			continue
		}
		if (!mismatch) {
			tally.sound++
			for (const { read } of app.modules) bump(reached, read)
			continue
		}
		// a bundle's import.meta.url is the bundle's, whose query is gone, which a
		// plain build can't show as it doesn't resolve a query
		if (
			bundlers.has(host.split(":")[0]) &&
			app.importing === "query" &&
			app.modules.some(({ read }) => read === "moduleMeta")
		) {
			tally.bundler++
			continue
		}
		// what the bundler alone builds otherwise isn't the plugin's
		if (bundlers.has(host.split(":")[0])) {
			const plain = await outcomeOf(host, dir, app, false)
			// compared as the plugin's are, without what an app compares of identity
			const plainObservations =
				"out" in plain && withoutIdentity(observationsOf(plain.out))
			if (
				(observations &&
					plainObservations &&
					(app.probe ?
						normalized(plainObservations) === normalized(observations)
					:	normalized(verdictsOf(plainObservations)) ===
						normalized(verdictsOf(observations)))) ||
				// a crash it builds alone too
				(!observations &&
					"out" in plain &&
					!plainObservations &&
					errorOf(plain.out) === errorOf(outcome.out))
			) {
				tally.bundler++
				continue
			}
		}
		tally.unsound++
		sound = false
		console.error(
			`\nUNSOUND (${host}): kept in ${keepFailure(app, host, expected, outcome.out)}\n${mismatch.slice(0, 900)}`
		)
	}
	rmSync(dir, { recursive: true, force: true })
	return sound
}

const started = Date.now()
if (countArg === "probes") {
	for (const probe of Object.keys(probes)) {
		if (seedArg && !probe.startsWith(seedArg)) continue
		const sound = await check({
			modules: [],
			importing: "static",
			writes: false,
			config: "none",
			configFirst: true,
			readsAllows: false,
			comparesIdentity: false,
			probe
		})
		console.log(`probe ${probe}: ${sound ? "sound" : "UNSOUND"}`)
	}
} else if (countArg === "twins") {
	await check({
		modules: [{ read: "literal", wrapper: "narrow" }],
		importing: "static",
		writes: false,
		config: "none",
		configFirst: true,
		readsAllows: false,
		comparesIdentity: true,
		twins: true
	})
} else if (countArg === "catalog") {
	const wrapper = seedArg ?? "narrow"
	for (const read of readNames) {
		// a chunk that took in the module holding its state makes it anew when run
		// again, as the bundler laid it out, whole or pruned
		if (importingArg === "again" && reads[read].includes("./shared.ts"))
			continue
		await check({
			modules: [
				{ read, wrapper },
				{ read, wrapper }
			],
			importing: (importingArg ?? "static") as App["importing"],
			// a chunk holding a module it wrote state to reads it anew when run again
			writes: importingArg !== "again",
			config: "none",
			configFirst: true,
			readsAllows: false,
			comparesIdentity: false
		})
	}
} else {
	const count = Number(countArg)
	let seed = seedArg === undefined ? Date.now() % 1_000_000 : Number(seedArg)
	let remaining = count
	while (remaining > 0) {
		const result = await fc.check(
			fc.asyncProperty(apps, app => check(app)),
			{ numRuns: remaining, seed, endOnFailure: true }
		)
		if (!result.failed) break
		console.error(
			`seed ${seed} run ${result.numRuns}: counterexample\n${sourceOfApp(result.counterexample![0])}`
		)
		if (result.error) console.error(result.errorInstance ?? result.error)
		remaining -= result.numRuns
		seed++
	}
}

for (const host of hosts) {
	const t = tallies[host]
	console.log(
		`${host}: ${t.sound} sound, ${t.unsound} unsound, ${t.flips} F1 flips, ${t.identities} F2 identities, ${t.bundler} as the bundler alone builds them, refused: ${JSON.stringify(t.refused)}`
	)
}
console.log(
	`reads reached: ${Object.keys(reached).length} of ${readNames.length}; never: ${readNames.filter(read => !reached[read]).join(", ")}`
)
console.log(
	`${countArg} apps from seed ${seedArg} in ${Math.round((Date.now() - started) / 1000)}s${failures.length ? `\n${failures.length} unsound, kept in:\n${failures.join("\n")}` : ""}`
)
rmSync(root, { recursive: true, force: true })
process.exit(failures.length ? 1 : 0)
