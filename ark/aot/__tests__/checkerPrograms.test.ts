import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { writeFixture } from "./utils.ts"

// programs a size build composes from checkers, each run as arktype runs it:
// what's returned or reported, which callbacks run and in what order. Each theme
// is a program, as what a program holds decides the runtime it reads

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts", "production"]

const bundle = async (root: string, opts: PrecompileUnpluginOptions) => {
	const { outputFiles } = await build({
		entryPoints: [join(root, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [precompile.esbuild({ cwd: root, conditions, ...opts })]
	})
	return outputFiles![0].text
}

const outputOf = (args: string[], options: object) => {
	const { stdout, stderr } = spawnSync(process.execPath, args, {
		encoding: "utf8",
		maxBuffer: 1 << 29,
		...options
	})
	return `${stdout}${stderr.match(/^\w*Error\b.*$/m)?.[0] ?? ""}`
}

// a build's messages are arktype's, so its output is compared as is
const comparable = (text: string) => text

const builds: Record<string, PrecompileUnpluginOptions> = {
	smallest: { preset: "smallest" },
	"for size": { optimize: "size" },
	"smallest, each module alone": { preset: "smallest", prune: false }
}

// enough that checkers repay the runtime they read
const repaying = Array.from(
	{ length: 30 },
	(_, i) =>
		`export const F${i} = type({ a${i}: "string > ${i}", b${i}: "number > ${i}", c${i}: "string < ${i + 9}" })`
).join("\n")

const helpers = `import { type } from "arktype"

export const run = (f: () => unknown) => {
	globalThis.calls = []
	let out
	try { out = f() } catch (e) { out = "THREW " + e.constructor.name + " " + e.message }
	console.log(out instanceof type.errors ? out.summary : JSON.stringify(out, (_, v) => v === undefined ? "__undefined" : Object.is(v, -0) ? "__-0" : Number.isNaN(v) ? "__NaN" : v), globalThis.calls.join())
}
export const trim = function (s: string) { globalThis.calls.push("trim:" + s); return s.trim() }
export const size = function (s: string) { globalThis.calls.push("size:" + s); return s.length }
export const isLong = function (s: string) { globalThis.calls.push("long:" + s); return s.length > 2 }
export const N = type("number")
export const parse = function (s: string) { globalThis.calls.push("parse:" + s); return N(Number(s)) }
export const Trim = type("string").pipe(trim)
export const Bounded = Trim.to("1 <= string <= 3")
export const Parsed = type("string").pipe(parse)
export const Positive = Parsed.to("number > 0")
export const Long = type("string").narrow(isLong)
`

const moduleOf = (body: string) => `import { scope, type } from "arktype"
import { Bounded, isLong, Long, N, parse, Parsed, Positive, run, size, trim, Trim } from "./helpers.ts"

${body}
`

const rowsOf = (T: string) => `[
	["${T}", ${T}, self],
	["${T}.k", type({ k: ${T} }), wrapped],
	["${T}.k?", type({ "k?": ${T} }), wrapped],
	["${T}[]", ${T}.array(), (d: unknown) => [d, d]],
	["${T}.kj", type({ k: ${T}, j: "number" }), (d: unknown) => ({ k: d, j: "n" })],
	["${T}.index", type({ "[string]": ${T} }), (d: unknown) => ({ k: d, j: "abcd" })],
	["${T}|number", ${T}.or("number"), self],
	["${T}|o", ${T}.or({ o: "string" }), self],
	["${T}|narrowed", ${T}.or(${T}.narrow(other)), self],
	["(${T}|number).k", type({ k: ${T}.or("number") }), wrapped],
	["(${T}|o.T).k", type({ k: ${T}.or({ o: ${T} }) }), (d: unknown) => ({ k: { o: d } })],
	["${T}=>trim", ${T}.pipe(trim), self],
	["${T}=>trim|>string", ${T}.pipe(trim).to("string"), self],
	["trim|>${T}", type("string").pipe(trim).to(${T}), self],
	["${T}=>trim.k", type({ k: ${T}.pipe(trim) }), wrapped],
	["${T}=>trim.k?", type({ "k?": ${T}.pipe(trim) }), wrapped],
	["trim|>${T}.k?", type({ "k?": type("string").pipe(trim).to(${T}) }), wrapped],
	["${T}=>trim=d", type({ "k?": ${T}.pipe(trim), d: "string = 'x'" }), wrapped],
	["trim|>${T}.k", type({ k: type("string").pipe(trim).to(${T}) }), wrapped],
	["trim|>${T}.kj", type({ k: type("string").pipe(trim).to(${T}), j: Trim }), (d: unknown) => ({ k: d, j: " j " })],
	["${T}.kjT", type({ k: ${T}, j: ${T} }), (d: unknown) => ({ k: d, j: d })],
	["any|>${T}", type("string|number").pipe(function (v) { return v }).to(${T}), self]
]`

const objectRowsOf = (T: string) => `[
	["${T}", ${T}, self],
	["${T}.k", type({ k: ${T} }), wrapped],
	["${T}[]", ${T}.array(), (d: unknown) => [d]],
	["${T}|string", ${T}.or("string"), self],
	["(${T}|string).k", type({ k: ${T}.or("string") }), wrapped],
	["${T}=>", ${T}.pipe(function (v) { return [v] }), self]
]`

const indexRows = (T: string) => `
run(() => ${T}({}))
run(() => ${T}({ a: 1 }))
run(() => ${T}({ a: "x" }))
run(() => ${T}({ a: 1, b: "x", c: true }))
run(() => ${T}({ ab: 1, abc: "x" }))
run(() => ${T}({ ab: "1", abc: 2, abcd: 3 }))
run(() => ${T}({ [Symbol.for("s")]: 1 }))
run(() => ${T}({ [Symbol.for("s")]: "x" }))
run(() => ${T}(5))
run(() => ${T}(null))
run(() => ${T}([1]))
run(() => ${T}(["x"]))
run(() => ${T}(Object.create({ inherited: "x" })))
run(() => ${T}.allows({ a: 1 }))
run(() => ${T}.allows({ a: "x" }))
run(() => ${T}.allows({ ab: "x" }))
run(() => type({ k: ${T} })({ k: { ab: "x" } }))
run(() => type({ k: ${T} })({ k: { abc: "x" } }))
run(() => ${T}.array()([{ ab: 1 }, { ab: "x" }]))
run(() => ${T}.or("string")({ ab: "x" }))
run(() => ${T}.or("string")({ ab: 1 }))
run(() => ${T}.pipe(function (v) { return [v] })({ ab: 1 }))
run(() => ${T}.pipe(function (v) { return [v] })({ ab: "x" }))
run(() => globalThis.calls)
`

const isLongKey = `function (k: string) { globalThis.calls.push("key:" + k); return k.length > 1 }`
const ctxKey = `function (k: string, ctx: any) { globalThis.calls.push("ctxkey:" + k); return k.length > 1 || ctx.reject({ message: "short key" }) }`
const ctxValue = `function (v: number, ctx: any) { globalThis.calls.push("ctxvalue:" + v); return v > 0 || ctx.reject({ message: "positive" }) }`

const discRows = (T: string, good: string) => `
run(() => ${T}(${good}))
run(() => ${T}({ ok: true }))
run(() => ${T}({ ok: false }))
run(() => ${T}({ ok: false, b: "x" }))
run(() => ${T}({ ok: true, a: 1 }))
run(() => ${T}({ ok: "true", a: "x" }))
run(() => ${T}({ ok: 1, a: "x" }))
run(() => ${T}({ ok: null }))
run(() => ${T}({}))
run(() => ${T}(5))
run(() => ${T}(null))
run(() => ${T}.allows({ ok: true, a: "x" }))
run(() => ${T}.allows({ ok: "true", a: "x" }))
run(() => ${T}.allows({ ok: false, b: 1 }))
run(() => type({ k: ${T} })({ k: { ok: "false" } }))
run(() => ${T}.array()([{ ok: true, a: "x" }, { ok: 1 }]))
run(() => ${T}.or("string")({ ok: 2 }))
run(() => ${T}.or("string")("s"))
run(() => globalThis.calls)
`

const cases: Record<string, string> = {
	defaultSharesRoot: `const A = type("string[]")
const B = type({ a: [A, "=", () => []] })
const C = type("string[]")
const D = type({ b: [A, "=", () => ["x"]], c: [C, "=", () => ["y"]] })
run(() => [A === C, A === (B as any), C.expression])
run(() => B({}))
run(() => B({ a: ["z"] }))
run(() => B({ a: [1] }))
run(() => D({}))
run(() => D({ b: 1 }))
run(() => A(["x"]))
run(() => A([1]))
run(() => C([1]))`,
	defaultFails: `const A = type("string[]")
const B = type({ a: [A, "=", () => [1 as never]] })
run(() => B({}))
run(() => B({ a: ["z"] }))`,
	discBool: `const T = type({ ok: "true", a: "string" }).or({ ok: "false", b: "number" })
${discRows("T", '{ ok: true, a: "x" }')}`,
	discBoolOne: `const T = type({ ok: "true", a: "string" }).or({ ok: "false" })
${discRows("T", "{ ok: false }")}`,
	discBoolClosed: `const T = type({ "+": "reject", ok: "true", a: "string" }).or({ "+": "reject", ok: "false", b: "number" })
${discRows("T", '{ ok: true, a: "x" }')}
run(() => T({ ok: true, a: "x", c: 1 }))`,
	discBoolMorph: `const T = type({ ok: "true", a: Trim }).or({ ok: "false", b: Parsed })
${discRows("T", '{ ok: true, a: " x " }')}
run(() => T({ ok: false, b: "5" }))
run(() => T({ ok: false, b: "n" }))
run(() => T({ ok: true, a: "  " }))`,
	discBoolDescribed: `const T = type({ ok: "true", a: "string" }).or({ ok: "false", b: "number" }).describe("a result")
${discRows("T", '{ ok: true, a: "x" }')}`,
	discBoolString: `const T = type({ ok: "true", a: "string" }).or({ ok: "'false'", b: "number" })
${discRows("T", '{ ok: true, a: "x" }')}
run(() => T({ ok: "false", b: 1 }))
run(() => T({ ok: false, b: 1 }))`,
	discBoolMissing: `const T = type({ ok: "true", a: "string" }).or({ b: "number" })
${discRows("T", '{ ok: true, a: "x" }')}
run(() => T({ b: 1 }))`,
	discStringTrue: `const T = type({ ok: "'true'", a: "string" }).or({ ok: "'false'", b: "number" })
${discRows("T", '{ ok: "true", a: "x" }')}
run(() => T({ ok: "false", b: 1 }))
run(() => T({ ok: true, a: "x" }))`,
	discEscaped: `const T = type({ kind: type.unit('a"b'), x: "string" }).or({ kind: type.unit("c\\\\d"), y: "number" }).or({ kind: type.unit("e\\nf"), z: "boolean" })
run(() => T({ kind: 'a"b', x: "s" }))
run(() => T({ kind: "c\\\\d", y: 1 }))
run(() => T({ kind: "e\\nf", z: true }))
run(() => T({ kind: 'a"b', x: 1 }))
run(() => T({ kind: "q" }))
run(() => T.allows({ kind: 'a"b', x: "s" }))
run(() => T.allows({ kind: "c\\\\d", y: 1 }))
run(() => T.allows({ kind: "e\\nf", z: true }))
${repaying}`,
	indexPlain: `const T = type({ "[string]": "number" })
${indexRows("T")}`,
	indexSymbol: `const T = type({ "[symbol]": "number" })
${indexRows("T")}`,
	indexBoth: `const T = type({ "[string|symbol]": "number" })
${indexRows("T")}`,
	indexPattern: `const T = type({ "[/^a/]": "number", "[/b$/]": "number | string" })
${indexRows("T")}`,
	indexProps: `const T = type({ "a?": "number", "[/^ab/]": "number" })
${indexRows("T")}`,
	indexRequired: `const T = type({ ab: "number", "[/^ab/]": "number|string" })
${indexRows("T")}`,
	indexReject: `const T = type({ "+": "reject", "[/^ab/]": "number" })
${indexRows("T")}`,
	indexRejectProps: `const T = type({ "+": "reject", a: "number", "[/^ab/]": "number" })
${indexRows("T")}`,
	indexDescribed: `const T = type({ "+": "reject", "[/^ab/]": "number" }).describe("indexed")
${indexRows("T")}`,
	indexNarrowKey: `const K = type("string").narrow(${isLongKey})
const T = type.Record(K, "number")
${indexRows("T")}`,
	indexNarrowKeyReject: `const K = type("string").narrow(${isLongKey})
const T = type.Record(K, "number").onUndeclaredKey("reject")
${indexRows("T")}`,
	indexCtxKey: `const K = type("string").narrow(${ctxKey})
const T = type.Record(K, "number")
${indexRows("T")}`,
	indexCtxKeyReject: `const K = type("string").narrow(${ctxKey})
const T = type.Record(K, "number").onUndeclaredKey("reject")
${indexRows("T")}`,
	indexCtxKeyRejectNarrow: `const K = type("string").narrow(${ctxKey})
const T = type.Record(K, "number").onUndeclaredKey("reject").narrow(function (v, ctx) { globalThis.calls.push("whole"); return Object.keys(v).length < 3 || ctx.reject({ message: "too many" }) })
${indexRows("T")}`,
	indexCtxValue: `const V = type("number").narrow(${ctxValue})
const T = type({ "[string]": V })
${indexRows("T")}`,
	indexCtxValueKey: `const K = type("string").narrow(${ctxKey})
const V = type("number").narrow(${ctxValue})
const T = type.Record(K, V).onUndeclaredKey("reject")
${indexRows("T")}`,
	indexMorphValue: `const T = type({ "[string]": Trim })
run(() => T({ a: " x " }))
run(() => T({ a: 1 }))`,
	indexAliasValue: `const $ = scope({ V: { x: "number" }, T: { "[string]": "V" } }).export()
const T = $.T
${indexRows("T")}
run(() => T({ a: { x: "no" } }))
run(() => T({ a: { x: 1 } }))`,
	indexCycle: `const $ = scope({ T: { "[string]": "T | number" } }).export()
const T = $.T
${indexRows("T")}`,
	indexErrors: `const T = type({ "[string]": "number", "b?": "number" })
const U = type({ "[string]": "string | number" }).and({ a: "string" })
run(() => U({ a: 1 }))
run(() => U({ b: 1 }))
run(() => U({ a: "", b: true }))
run(() => T({ b: 1, c: "y" }))`,
	indexes: `
run(() => type("number[]")([1, "a"]))
run(() => type("string").array().array()([[""], [1]]))
run(() => type(["number", "string"])([1, 1]))
run(() => type({ a: "number[]" })({ a: [1, "a"] }))
`,
	depths: `
const Deep = type({ a: Trim, "b?": Bounded, c: { d: Bounded, e: Trim.array() }, f: Bounded.array() })
const good = { a: " a ", c: { d: " d ", e: [" e "] }, f: [" f "] }
run(() => Deep(good))
run(() => good)
run(() => Deep({ ...good, b: "    " }))
run(() => Deep({ ...good, c: { d: " long long ", e: [1] } }))
run(() => Deep({ ...good, f: [" f ", "  ", " long long "] }))
run(() => Deep({ a: 1 }))
run(() => Deep({ ...good, a: 1 }))
run(() => Deep({ ...good, b: 1 }))
run(() => Deep.allows(good))
run(() => Deep.allows({ ...good, f: 1 }))
run(() => Deep.assert(good))
run(() => Deep.assert({ ...good, f: ["  "] }))
run(() => Bounded(" abc "))
run(() => Bounded("  "))
run(() => Bounded(1))
run(() => Trim(1))
`,
	rangeUnion: `
const RangeNull = type("number>5").pipe(() => null).or("number<3")
const RangeUndef = type("number>5").pipe(() => undefined).or("number<3")
const RangeErr = type("number>5").pipe((n, ctx) => ctx.error("bad")).or("number<3")
const RangeTwo = type("number>5").pipe(n => n + 1).or(type("number<3").pipe(n => n - 1))
const RangeKey = type({ a: type("number>5").pipe(() => null).or("number<3") })
run(() => RangeNull(6))
run(() => RangeNull(1))
run(() => RangeNull(4))
run(() => RangeUndef(6))
run(() => RangeErr(6))
run(() => RangeErr(1))
run(() => RangeTwo(6))
run(() => RangeTwo(1))
run(() => RangeKey({ a: 6 }))
run(() => RangeKey({ a: 1 }))
run(() => RangeKey({ a: 4 }))
const Obj = type({ "a?": "string" }).pipe(() => null).or("string")
run(() => Obj({}))
run(() => Obj("a"))
`,
	defaultKinds: `
const sym = Symbol.for("x")
const UnionDefault = type({ k: [type({ a: "string = 'x'" }).or("string"), "=", "y"] })
const SymDefault = type({ k: ["symbol", "=", sym] })
const NestedLiteral = type({ o: type({ a: "string = 'x'" }), p: "string = 'q'" })
const Undefinable = type({ k: type("string | undefined").default("d"), l: "string" })
const Deleted = type({ "+": "delete", o: type({ a: "string = 'x'" }), p: "string = 'q'" })
const DeletedUndefinable = type({ "+": "delete", k: type("string | undefined").default("d") })
class Inst { o = {}; extra = 1; get g() { return 1 } }
const Instance = type({ "+": "delete", o: type({ a: "string = 'x'" }), p: "string = 'q'" })
const InstanceFn = type({ "+": "delete", p: ["string", "=", () => "fn"], "s?": type("string").pipe(s => s.length) })
const Arr = type({ a: "string = 'x'" }).array()
const ArrFn = type({ a: ["string", "=", () => "x"] }).array()
const ClosedUnd = type({ "+": "reject", k: type("string | undefined").default("d") })
const ClosedLit = type({ "+": "reject", k: "string = 'd'" })
const ClosedFn = type({ "+": "reject", k: ["string", "=", () => "fn"] })
run(() => UnionDefault({}))
run(() => UnionDefault({ k: {} }))
run(() => UnionDefault({ k: "z" }))
run(() => String(SymDefault({}).k))
run(() => NestedLiteral({ o: {} }))
run(() => NestedLiteral({ o: { a: "a" }, p: "p" }))
run(() => Undefinable({ l: "l" }))
run(() => Undefinable({ k: undefined, l: "l" }))
run(() => Undefinable({ k: "k", l: "l" }))
run(() => Object.keys(Undefinable({ l: "l", k: undefined })))
run(() => Deleted({ o: {}, z: 1 }))
run(() => Deleted({ o: { a: "a", b: "b" }, p: "p", z: 1 }))
run(() => DeletedUndefinable({ z: 1 }))
run(() => DeletedUndefinable({ k: undefined, z: 1 }))
run(() => Object.keys(Instance(new Inst())))
run(() => Object.getPrototypeOf(Instance(new Inst())) === Inst.prototype)
run(() => Instance(new Inst()).p)
run(() => Object.keys(InstanceFn(new Inst())))
run(() => InstanceFn(new Inst()).p)
run(() => InstanceFn({ s: "abc" }))
run(() => Arr([{}, { a: "a" }]))
run(() => Arr([{ a: 1 }]))
run(() => ArrFn([{}, { a: "a" }]))
const input = [{ a: "a" }]
run(() => Arr(input) === input)
run(() => ArrFn(input) === input)
run(() => ClosedUnd({}))
run(() => ClosedUnd({ z: 1 }))
run(() => ClosedLit({}))
run(() => ClosedLit({ z: 1 }))
run(() => ClosedFn({}))
run(() => ClosedFn({ z: 1 }))
const UnionRange = type({ n: "number > 5", b: "string = 'x'" }).or({ n: "number < 3", d: "string = 'y'" })
run(() => UnionRange({ n: 6 }))
run(() => UnionRange({ n: 1 }))
run(() => UnionRange({ n: 4 }))
const UnionFn = type({ n: "number > 5", b: ["string", "=", () => "x"] }).or({ n: "number < 3" })
run(() => UnionFn({ n: 6 }))
run(() => UnionFn({ n: 1 }))
const UnionFnArr = type({ n: "number > 5", b: ["string", "=", () => "x"] }).or({ n: "number < 3" }).array()
run(() => UnionFnArr([{ n: 6 }, { n: 1 }]))
const failing = (_: unknown, ctx: any) => ctx.error("nope")
const UnionKeyFn = type({ k: "'a'", b: ["string", "=", () => "x"] }).or({ k: "'b'", c: "string = 'y'" })
run(() => UnionKeyFn({ k: "a" }))
run(() => UnionKeyFn({ k: "b" }))
run(() => UnionKeyFn({ k: "c" }))
const UnionKeyLit = type({ k: "'a'", b: "string = 'x'" }).or({ k: "'b'", c: "string = 'y'" })
run(() => UnionKeyLit({ k: "a" }))
run(() => UnionKeyLit({ k: "b" }))
run(() => UnionKeyLit({ k: "c" }))
const UnionBool = type({ k: "true", b: "string = 'x'" }).or({ k: "false", c: "string = 'y'" })
run(() => UnionBool({ k: true }))
run(() => UnionBool({ k: false }))
run(() => UnionBool({ k: "true" }))
const DomainLit = type({ b: "string = 'x'" }).or("string")
run(() => DomainLit({}))
run(() => DomainLit("s"))
run(() => DomainLit(1))
const DomainFn = type({ b: ["string", "=", () => "x"] }).or("string")
run(() => DomainFn({}))
run(() => DomainFn("s"))
const Nullable = type({ b: "string = 'x'" }).or("null")
run(() => Nullable({}))
run(() => Nullable(null))
run(() => Nullable(1))
const KeyOr = type({ k: "'a'", b: "string = 'x'" }).or({ k: "'b'" }).or({ k: "string", "z?": "number", y: "string = 'y'" }.k === "x" ? "string" : "number")
run(() => KeyOr({ k: "a" }))
run(() => KeyOr(1))
`,
	unionHoldingCycle: `
const $ = scope({
	Tree: { "left?": "Tree", v: "string = 'x'" },
	Holder: { n: "number > 5", tree: "Tree" },
	Other: { n: "number < 3" },
	U: "Holder | Other",
	Morphed: { k: "'a'", tree: "Tree" },
	Plain: { k: "'b'" },
	K: "Morphed | Plain"
})
const types = $.export()
run(() => types.U({ n: 6, tree: { left: {} } }))
run(() => types.U({ n: 1 }))
run(() => types.U({ n: 4 }))
run(() => types.U({ n: 6, tree: { v: 1 } }))
run(() => types.K({ k: "a", tree: {} }))
run(() => types.K({ k: "b" }))
run(() => types.K({ k: "c" }))
const Wrap = type({ u: types.U, list: types.K.array() })
run(() => Wrap({ u: { n: 6, tree: {} }, list: [{ k: "a", tree: { left: {} } }, { k: "b" }] }))
run(() => Wrap({ u: { n: 4 }, list: [] }))
`,
	literalDefaults: `
const NestedLiteral = type({ o: type({ a: "string = 'x'" }), p: "string = 'q'" })
run(() => NestedLiteral({ o: {} }))
run(() => NestedLiteral({ o: { a: "a" }, p: "p" }))
const Deleted = type({ "+": "delete", o: type({ a: "string = 'x'" }), p: "string = 'q'" })
run(() => Deleted({ o: {}, z: 1 }))
run(() => Deleted({ o: { a: "a", b: "b" }, p: "p", z: 1 }))
class Inst { o = {}; extra = 1; get g() { return 1 } }
run(() => Object.keys(Deleted(new Inst())))
run(() => Object.getPrototypeOf(Deleted(new Inst())) === Inst.prototype)
run(() => Deleted(new Inst()).p)
const Arr = type({ a: "string = 'x'" }).array()
run(() => Arr([{}, { a: "a" }]))
run(() => Arr([{ a: 1 }]))
const input = [{ a: "a" }]
run(() => Arr(input) === input)
const ClosedLit = type({ "+": "reject", k: "string = 'd'" })
run(() => ClosedLit({}))
run(() => ClosedLit({ z: 1 }))
const UnionRange = type({ n: "number > 5", b: "string = 'x'" }).or({ n: "number < 3", d: "string = 'y'" })
run(() => UnionRange({ n: 6 }))
run(() => UnionRange({ n: 1 }))
run(() => UnionRange({ n: 4 }))
const UnionKeyLit = type({ k: "'a'", b: "string = 'x'" }).or({ k: "'b'", c: "string = 'y'" })
run(() => UnionKeyLit({ k: "a" }))
run(() => UnionKeyLit({ k: "b" }))
run(() => UnionKeyLit({ k: "c" }))
const UnionBool = type({ k: "true", b: "string = 'x'" }).or({ k: "false", c: "string = 'y'" })
run(() => UnionBool({ k: true }))
run(() => UnionBool({ k: false }))
run(() => UnionBool({ k: "true" }))
const DomainLit = type({ b: "string = 'x'" }).or("string")
run(() => DomainLit({}))
run(() => DomainLit("s"))
run(() => DomainLit(1))
const Nullable = type({ b: "string = 'x'" }).or("null")
run(() => Nullable({}))
run(() => Nullable(null))
run(() => Nullable(1))
const UnionDefault = type({ k: [type({ a: "string = 'x'" }).or("string"), "=", "y"] })
run(() => UnionDefault({}))
run(() => UnionDefault({ k: {} }))
run(() => UnionDefault({ k: "z" }))
const sym = Symbol.for("x")
const SymDefault = type({ k: ["symbol", "=", sym] })
run(() => String(SymDefault({}).k))
const Undefinable = type({ k: type("string | undefined").default("d"), l: "string" })
run(() => Undefinable({ l: "l" }))
run(() => Undefinable({ k: undefined, l: "l" }))
run(() => Object.keys(Undefinable({ l: "l", k: undefined })))
const DeletedUndefinable = type({ "+": "delete", k: type("string | undefined").default("d") })
run(() => DeletedUndefinable({ z: 1 }))
run(() => DeletedUndefinable({ k: undefined, z: 1 }))
const WithRecord = type({ meta: "Record<string, string>", d: "string = 'x'" })
run(() => WithRecord({ meta: { a: "a" } }))
run(() => WithRecord({ meta: { a: 1 } }))
run(() => WithRecord({ meta: [] }))
run(() => WithRecord({ meta: 1 }))
const Rec = type("Record<string, number>")
run(() => Rec({ a: 1, [Symbol.for("s")]: "symbol is unchecked" }))
run(() => Object.keys(Rec({ a: 1 })))
run(() => Rec.allows({ a: "x" }))
run(() => Rec({ a: "x", b: "y" }))
`,
	nullish: `
const Nothing = type("string").pipe(() => undefined)
const Null = type("string").pipe(() => null)
const Zero = type("number").pipe(function (n) { return n === 1 ? -0 : n })
const Nan = type("string").pipe(function () { return NaN })
const Pair = type({ a: Nothing, b: Null, "c?": Nothing, d: "string" })
run(() => Nothing("a"))
run(() => Null("a"))
run(() => Pair({ a: "a", b: "b", d: "d" }))
run(() => Object.keys(Pair({ a: "a", b: "b", c: "c", d: "d" })))
run(() => type({ a: Nothing.or("number") })({ a: "a" }))
run(() => type({ a: Null.or("number") })({ a: "a" }))
run(() => type({ a: Nothing.or("number") })({ a: 1 }))
run(() => Nothing.or("number")("a"))
run(() => Null.or("number")("a"))
const KeyedNull = type({ k: "'a'", v: "string" }).pipe(() => null).or({ k: "'b'" })
run(() => KeyedNull({ k: "a", v: "" }))
run(() => KeyedNull({ k: "b" }))
const Keyed2 = type({ k: "'a'", v: "string" }).pipe(() => undefined).or({ k: "'b'", w: "string" })
run(() => Keyed2({ k: "a", v: "" }))
run(() => Keyed2({ k: "b", w: "" }))
run(() => Zero(1))
run(() => Object.is(Zero(1), -0))
run(() => type({ n: Zero })({ n: 1 }))
run(() => Object.is(type({ n: Zero })({ n: 1 }).n, -0))
run(() => Object.is(type({ n: Zero })({ n: 0 }).n, 0))
run(() => Object.is(Zero.array()([1])[0], -0))
run(() => Nan("x"))
run(() => type({ n: Nan })({ n: "x" }))
const SameN = type("number").pipe(function (n) { return n })
const input = { n: NaN }
run(() => type({ n: SameN })(input) === input)
const input0 = { n: 0 }
run(() => type({ n: SameN })(input0) === input0)
`,
	returnsErrors: `
const Deep = type({ a: Parsed, list: Parsed.array(), nested: { b: Parsed } })
run(() => Parsed("x"))
run(() => Parsed("1"))
run(() => Parsed(1))
run(() => Deep({ a: "x", list: ["1", "x"], nested: { b: "x" } }))
run(() => Deep({ a: "1", list: [], nested: { b: "2" } }))
run(() => Deep({ a: "x", list: 1, nested: { b: "x" } }))
run(() => Deep({ a: 1, list: ["x", "1"], nested: { b: 1 } }))
const Mixed = type({ x: Parsed, y: Positive, z: Trim, "o?": Positive })
run(() => Mixed({ x: "1", y: "2", z: " z " }))
run(() => Mixed({ x: "a", y: "b", z: " z " }))
run(() => Mixed({ x: "a", y: "-1", z: " z ", o: "-2" }))
run(() => Mixed({ x: "1", y: "-1", z: 1, o: "-2" }))
run(() => Mixed({ x: 1, y: "b", z: " z ", o: 1 }))
run(() => Positive("3"))
run(() => Positive("-3"))
run(() => Positive("x"))
const Arr = Positive.array()
run(() => Arr(["1", "x", "-1"]))
run(() => Arr(["1", 1, "-1"]))
`,
	heads: `
const Head = type({ a: Trim }).pipe(function (o) { globalThis.calls.push("head"); return { ...o, tagged: true } })
run(() => Head({ a: " a " }))
run(() => Head({ a: 1 }))
const Failing = type({ a: Parsed }).pipe(function (o) { globalThis.calls.push("after"); return o })
run(() => Failing({ a: "1" }))
run(() => Failing({ a: "x" }))
const FailingCtx = type({ a: Positive }).pipe(function (o) { globalThis.calls.push("after"); return o })
run(() => FailingCtx({ a: "1" }))
run(() => FailingCtx({ a: "-1" }))
run(() => FailingCtx({ a: "x" }))
const Defaulted = type({ d: "string = 'x'" }).pipe(function (o) { globalThis.calls.push("d"); return o.d })
run(() => Defaulted({}))
run(() => Defaulted({ d: "y" }))
run(() => Defaulted({ d: 1 }))
const Nested = type({ h: Head, f: FailingCtx })
run(() => Nested({ h: { a: " a " }, f: { a: "1" } }))
run(() => Nested({ h: { a: " a " }, f: { a: "-1" } }))
const Chain = Trim.pipe(size).pipe(function (n) { globalThis.calls.push("n"); return n + 1 })
run(() => Chain(" abc "))
run(() => Chain(1))
const NoHead = type("unknown").pipe(function (v) { globalThis.calls.push("v"); return [v] })
run(() => NoHead(1))
run(() => type({ v: NoHead })({ v: 1 }))
run(() => type({ v: NoHead })({}))
const Narrowed = Long.pipe(trim)
run(() => Narrowed(" abc "))
run(() => Narrowed("a"))
run(() => type({ n: Narrowed, m: Long })({ n: "a", m: "a" }))
run(() => type({ n: Narrowed, m: Long })({ n: " abc ", m: "abc" }))
`,
	closedAndDeleted: `
const Closed = type({ "+": "reject", a: Trim, "b?": Bounded })
run(() => Closed({ a: " a " }))
run(() => Closed({ a: " a ", b: "  " }))
run(() => Closed({ a: " a ", c: 1 }))
run(() => Closed({ a: 1, c: 1 }))
const Deleting = type({ "+": "delete", a: Trim, "b?": Bounded })
run(() => Deleting({ a: " a " }))
run(() => Deleting({ a: " a ", c: 1 }))
run(() => Deleting({ a: " a ", b: "  ", c: 1 }))
run(() => Deleting({ a: 1, c: 1 }))
class Holder { a = " a "; c = 1; get x() { return 1 } }
run(() => { const out = Deleting(new Holder()); return [out instanceof Holder, Object.keys(out), out.a] })
const P = type({ a: Parsed, "+": "delete" })
run(() => P({ a: "x", c: 1 }))
run(() => P({ a: "1", c: 1 }))
const inherits = Object.create({ a: " a " })
run(() => { const out = type({ a: Trim })(inherits); return [Object.keys(out), out.a, Object.getPrototypeOf(out) !== Object.prototype] })
const d = new Date(0)
Object.assign(d, { a: " a " })
run(() => { const out = type({ a: Trim })(d); return [out === d, out instanceof Date, out.a] })
const list = Object.assign([" a "], { extra: 1 })
run(() => { const out = Trim.array()(list); return [out === list, out.extra, out[0]] })
`,
	unions: `
const Nullable = Trim.or("null")
run(() => Nullable(" a "))
run(() => Nullable(null))
run(() => Nullable(1))
run(() => type({ n: Nullable })({ n: " a " }))
run(() => type({ n: Nullable })({ n: 1 }))
const Keyed = type({ k: "'a'", v: Trim }).or({ k: "'b'", v: Bounded })
run(() => Keyed({ k: "a", v: " a " }))
run(() => Keyed({ k: "b", v: " b " }))
run(() => Keyed({ k: "b", v: "  " }))
run(() => Keyed({ k: "c", v: " b " }))
run(() => Keyed(1))
const Deep = type({ u: Keyed })
run(() => Deep({ u: { k: "b", v: "  " } }))
run(() => Deep({ u: { k: "a", v: 1 } }))
run(() => Deep.allows({ u: { k: "b", v: "  " } }))
const Indiscriminate = type("string > 3").pipe(trim).or(type("string < 2").pipe(size))
run(() => Indiscriminate(" a b "))
run(() => Indiscriminate(""))
run(() => Indiscriminate("aa"))
run(() => Indiscriminate(1))
const Above = type({ i: Indiscriminate, t: Trim, b: Bounded, p: Parsed })
run(() => Above({ i: " a b ", t: " t ", b: " b ", p: "1" }))
run(() => Above({ i: "aa", t: " t ", b: "  ", p: "x" }))
run(() => Above({ i: 1, t: 1, b: 1, p: 1 }))
run(() => Above({ i: "", t: " t ", b: "  ", p: "x" }))
const Mix = type({ i: Indiscriminate.array(), p: Parsed.array() })
run(() => Mix({ i: ["", " a b "], p: ["x"] }))
const Domains = Trim.or("number").or(type({ o: Bounded }))
run(() => Domains(" a "))
run(() => Domains(1))
run(() => Domains({ o: " a " }))
run(() => Domains({ o: "  " }))
run(() => Domains(true))
`,
	pipedTo: `
const ToDefault = type("string").pipe(function (s) { globalThis.calls.push("json"); return JSON.parse(s) }).to({ d: "string = 'x'" })
run(() => ToDefault("{}"))
run(() => ToDefault('{"d":1}'))
run(() => type({ t: ToDefault })({ t: "{}" }))
run(() => type({ t: ToDefault })({ t: '{"d":1}' }))
const ToMorph = type("string").pipe(function (s) { globalThis.calls.push("json"); return JSON.parse(s) }).to({ a: Trim, "b?": Bounded })
run(() => ToMorph('{"a":" a "}'))
run(() => ToMorph('{"a":1}'))
run(() => ToMorph('{"a":" a ","b":"  "}'))
run(() => type({ t: ToMorph })({ t: '{"a":" a ","b":"  "}' }))
run(() => type({ t: ToMorph, u: ToMorph.array() })({ t: '{"a":1}', u: ['{"a":1}', '{"a":" a "}'] }))
const ToUnion = Trim.to("'a' | 'b'")
run(() => ToUnion(" a "))
run(() => ToUnion(" c "))
const Twice = Trim.to("string > 1").pipe(size).to("number < 3")
run(() => Twice(" ab "))
run(() => Twice(" a "))
run(() => Twice(" abc "))
run(() => type({ t: Twice })({ t: " abc " }))
run(() => type({ t: Twice })({ t: " a " }))
const ToNarrow = Trim.to(Long)
run(() => ToNarrow(" abc "))
run(() => ToNarrow(" a "))
run(() => type({ l: ToNarrow.array() })({ l: [" a ", " abc ", " b "] }))
const data = { e: "x" }
const Identity = type("object").pipe(function (o) { return o }).to({ e: "string" })
run(() => Identity(data) === data)
`,
	ctxNarrows: `
const note = function (tag: string, ctx: any, s: unknown) { globalThis.calls.push(tag + ":" + JSON.stringify(s) + "@" + ctx.path.join(".") + "#" + ctx.errors.count + "?" + ctx.hasError()) }
const Rejecting = type("string").narrow(function (s, ctx) { note("rej", ctx, s); return s.length > 2 || ctx.reject({ expected: "long", message: "short!" }) })
const MustBe = type("string").narrow(function (s, ctx) { note("must", ctx, s); return s.length > 2 || ctx.mustBe("long") })
const AddsTrue = type("string").narrow(function (s, ctx) { note("adds", ctx, s); if (s === "x") ctx.error("no x"); return true })
const FalseOnly = type("string").narrow(function (s, ctx) { note("false", ctx, s); return s.length > 1 })
const AddsFalse = type("string").narrow(function (s, ctx) { note("addsFalse", ctx, s); ctx.error("always"); return false })
const Both = Rejecting.narrow(function (s, ctx) { note("both", ctx, s); return s !== "abc" || ctx.mustBe("not abc") })
const other = function (s, ctx) { note("other", ctx, s); return s === "x" }
const wrapped = (d: unknown) => ({ k: d })
const self = (d: unknown) => d
const shown = (out: any) => out instanceof type.errors ? out.summary : out
// takes one argument, so arktype passes no ctx where it only asks, but no build can prove it reads no other
const Arguments = type("string").narrow(function (s) { globalThis.calls.push("arguments:" + (arguments[1] === undefined)); return s.length > 2 })
const strings = [${["Rejecting", "MustBe", "AddsTrue", "FalseOnly", "AddsFalse", "Both", "Arguments"].map(rowsOf).join(", ")}]
for (const rows of strings) for (const [name, T, wrap] of rows) for (const data of ["x", "abc", "abcd", 1]) {
	run(() => [name, shown(T(wrap(data))), globalThis.calls])
	run(() => [name, T.allows(wrap(data)), globalThis.calls])
	run(() => [name, T.assert(wrap(data)), globalThis.calls])
}
const ReadsWhole = type({ a: "string", b: "number" }).narrow(function (o, ctx) { note("whole", ctx, o); return o.b > 0 || ctx.reject({ path: ["b"], expected: "positive" }) })
const WholeAddsTrue = type({ a: "string", b: "number" }).narrow(function (o, ctx) { note("wholeAdds", ctx, o); if (o.b === 0) ctx.error("zero"); return true })
const Transformed = type({ a: Trim, b: "number" }).narrow(function (o, ctx) { note("trans", ctx, o); return o.b > 0 || ctx.mustBe("positive") })
const TwoOnTransformed = type({ a: Trim, b: "number" }).narrow(function (o, ctx) { note("t1", ctx, o); return o.b > 0 || ctx.mustBe("positive") }).narrow(function (o, ctx) { note("t2", ctx, o); return o.b < 9 || ctx.mustBe("small") })
const Unary = type({ a: Trim, b: "number" }).narrow(function (o) { globalThis.calls.push("unary"); return o.b > 0 })
const Plain = type({ a: "string", b: "number" }).narrow(function (o) { globalThis.calls.push("plain"); return o.b > 0 })
const Closed = type({ "+": "reject", a: "string" }).narrow(function (o, ctx) { note("closed", ctx, o); return o.a !== "x" || ctx.mustBe("no x") })
const Deleted = type({ "+": "delete", a: Trim }).narrow(function (o, ctx) { note("deleted", ctx, o); return o.a !== " x " || ctx.mustBe("no x") })
const Defaulting = type({ a: "string = 'd'" }).narrow(function (o, ctx) { note("defaulting", ctx, o); return o.a !== "x" || ctx.mustBe("no x") })
const objects = [${["ReadsWhole", "WholeAddsTrue", "Transformed", "TwoOnTransformed", "Unary", "Plain", "Closed", "Deleted", "Defaulting"].map(objectRowsOf).join(", ")}]
for (const rows of objects) for (const [name, T, wrap] of rows) for (const data of [{ a: " x ", b: 1 }, { a: "x", b: 0 }, { a: "x", b: 10 }, { a: 1, b: 0 }, { a: 1 }, {}, { a: "x", extra: 1 }, 5]) {
	run(() => [name, shown(T(wrap(data))), globalThis.calls])
	run(() => [name, T.allows(wrap(data)), globalThis.calls])
}
const ArrayNarrow = type("string[]").narrow(function (a, ctx) { note("arr", ctx, a); return a.length > 1 || ctx.mustBe("long") })
const ArrayK = type({ k: ArrayNarrow })
for (const data of [[], ["a"], ["a", "b"], [1, 2], [1]]) {
	run(() => [shown(ArrayNarrow(data)), globalThis.calls])
	run(() => [ArrayNarrow.allows(data), globalThis.calls])
	run(() => [shown(ArrayK({ k: data })), globalThis.calls])
}
`,
	allowsStopping: `
const short = function (s: string, ctx: any) { globalThis.calls.push("short:" + s); return s.length < 5 || ctx.mustBe("short") }
const noBoom = function (s: string, ctx: any) { globalThis.calls.push("noBoom:" + s); if (s === "boom") throw new Error("boom"); return ctx.path.length > 0 }
const Keys = type({ k: type("string").narrow(short), j: type("string").narrow(noBoom) })
run(() => Keys.allows({ k: "toolong", j: "boom" }))
run(() => Keys({ k: "toolong", j: "ok" }))
const adds = function (s: string, ctx: any) { globalThis.calls.push("adds:" + s); if (s.startsWith("b")) ctx.error("no b"); return true }
const unary = function (s: string) { globalThis.calls.push("unary:" + s); return s.length > 1 }
const Each = type("string").narrow(adds).narrow(unary)
for (const data of ["bad", "b", "a"]) {
	run(() => Each.allows(data))
	run(() => Each(data))
}
${repaying}
`,
	sharedAlias: `
const shared = scope({ a: { kids: "union[]", "a?": "string" }, b: { kids: "union[]", "b?": "number" }, union: "a | b" }).export()
let deep: object = { kids: [], a: 1, b: "x" }
for (let i = 0; i < 18; i++) deep = { kids: [deep, deep] }
const issue = shared.union(deep).issues[0]
console.log(issue.errors.length, issue.message)
const Env = type({ "+": "delete", a: "string" })
process.env.a = "abc"
process.env.kept = "1"
const fromEnv = Env(process.env)
console.log(fromEnv === process.env, JSON.stringify(fromEnv), process.env.kept)
class Tagged { a = "abc"; extra = 1; get [Symbol.toStringTag]() { return "T" } }
const tagged = new Tagged()
console.log(Env(tagged) === tagged, Object.keys(tagged))
`,
	aliases: `
const printed = (v: any) => {
	if (v instanceof type.errors) return "ERR " + v.summary
	const ids = new Map()
	const p = (x: any): string => {
		if (typeof x !== "object" || x === null) return JSON.stringify(x) ?? String(x)
		if (ids.has(x)) return "#" + ids.get(x)
		ids.set(x, ids.size)
		return Array.isArray(x) ? "[" + x.map(p).join(",") + "]" : "{" + Object.keys(x).map(k => k + ":" + p(x[k])).join(",") + "}"
	}
	return p(v)
}
const Tree = type({ value: "string", "children?": "this[]" })
const Spec = type({ value: Trim, "children?": "this[]" })
const Held = type({ tree: Tree, n: "number" })
const HeldTrim = type({ tree: Tree, t: Trim })
const HeldSpec = type({ tree: Spec, n: "number" })
const SpecList = Spec.array()
const TreeList = Tree.array()
const OptionalSpec = type({ "tree?": Spec, n: "number" })
const Defaulted = type({ tree: Spec, d: "string = 'x'" })
const DefaultedTree = type({ tree: Tree, d: "string = 'x'" })
const Closed = type({ "+": "reject", tree: Spec })
const Deleted = type({ "+": "delete", tree: Spec })
const DeletedTree = type({ "+": "delete", tree: Tree, d: "string = 'x'" })
const OrString = Spec.or("string")
const TreeOrString = Tree.or("string")
const OrNull = Tree.or("null")
const Keyed = type({ k: "'a'", tree: Spec }).or({ k: "'b'", n: "number" })
const KeyedTree = type({ k: "'a'", tree: Tree }).or({ k: "'b'", tree: Spec })
const Nested = type({ a: { b: { c: Held } }, list: HeldSpec.array() })
const NarrowedCtx = type({ tree: Spec }).narrow(function (o, ctx) { globalThis.calls.push("ctx:" + ctx.path.join(".") + ":" + o.tree.value); return o.tree.value !== "no" || ctx.mustBe("not no") })
const NarrowedPlain = type({ tree: Tree }).narrow(function (o) { globalThis.calls.push("plain:" + o.tree.value); return o.tree.value !== "no" })
const NarrowedTree = type({ tree: Tree }).narrow(function (o, ctx) { globalThis.calls.push("ctxTree:" + ctx.path.join(".") + ":" + o.tree.value); return o.tree.value !== "no" || ctx.mustBe("not no") })
const AboveNarrowed = type({ x: NarrowedCtx, y: NarrowedTree, z: NarrowedPlain })
const Piped = Held.pipe(function (v) { globalThis.calls.push("piped"); return [v] })
const PipedSpec = HeldSpec.pipe(function (v) { globalThis.calls.push("pipedSpec"); return [v] })
const AbovePiped = type({ p: Piped, q: PipedSpec })
const Indexed = type({ "[string]": Spec })
const AboveIndexed = type({ i: Indexed, n: "number" })
const types: [string, any, (d: any) => any][] = [
	["Tree", Tree, d => d],
	["Spec", Spec, d => d],
	["Held", Held, d => ({ tree: d, n: 1 })],
	["Held.bad", Held, d => ({ tree: d, n: "x" })],
	["HeldTrim", HeldTrim, d => ({ tree: d, t: " t " })],
	["HeldTrim.bad", HeldTrim, d => ({ tree: d, t: 1 })],
	["HeldSpec", HeldSpec, d => ({ tree: d, n: 1 })],
	["HeldSpec.bad", HeldSpec, d => ({ tree: d, n: "x" })],
	["SpecList", SpecList, d => [d, d]],
	["TreeList", TreeList, d => [d, d]],
	["OptionalSpec", OptionalSpec, d => ({ tree: d, n: 1 })],
	["OptionalSpec.absent", OptionalSpec, d => ({ n: 1 })],
	["Defaulted", Defaulted, d => ({ tree: d })],
	["DefaultedTree", DefaultedTree, d => ({ tree: d })],
	["Closed", Closed, d => ({ tree: d })],
	["Closed.extra", Closed, d => ({ tree: d, extra: 1 })],
	["Deleted", Deleted, d => ({ tree: d, extra: 1 })],
	["DeletedTree", DeletedTree, d => ({ tree: d, extra: 1 })],
	["OrString", OrString, d => d],
	["TreeOrString", TreeOrString, d => d],
	["OrNull", OrNull, d => d],
	["Keyed.a", Keyed, d => ({ k: "a", tree: d })],
	["Keyed.b", Keyed, d => ({ k: "b", n: 1 })],
	["Keyed.c", Keyed, d => ({ k: "c", tree: d })],
	["KeyedTree.a", KeyedTree, d => ({ k: "a", tree: d })],
	["KeyedTree.b", KeyedTree, d => ({ k: "b", tree: d })],
	["Nested", Nested, d => ({ a: { b: { c: { tree: d, n: 1 } } }, list: [{ tree: d, n: 1 }, { tree: d, n: "x" }] })],
	["NarrowedCtx", NarrowedCtx, d => ({ tree: d })],
	["NarrowedPlain", NarrowedPlain, d => ({ tree: d })],
	["NarrowedTree", NarrowedTree, d => ({ tree: d })],
	["AboveNarrowed", AboveNarrowed, d => ({ x: { tree: d }, y: { tree: d }, z: { tree: d } })],
	["Piped", Piped, d => ({ tree: d, n: 1 })],
	["PipedSpec", PipedSpec, d => ({ tree: d, n: 1 })],
	["AbovePiped", AbovePiped, d => ({ p: { tree: d, n: 1 }, q: { tree: d, n: 1 } })],
	["Indexed", Indexed, d => ({ a: d, b: d })],
	["AboveIndexed", AboveIndexed, d => ({ i: { a: d, b: d }, n: 1 })]
]
const sharedLeaf = () => ({ value: " leaf " })
const leaf = sharedLeaf()
const datas: [string, () => any][] = [
	["plain", () => ({ value: " a " })],
	["no", () => ({ value: "no" })],
	["nested", () => ({ value: " a ", children: [{ value: " b " }, { value: " c ", children: [] }] })],
	["badValue", () => ({ value: 1 })],
	["badChild", () => ({ value: " a ", children: [{ value: 1 }, { value: 2, children: [{ value: 3 }] }] })],
	["badChildren", () => ({ value: " a ", children: 1 })],
	["missing", () => ({})],
	["notObject", () => 5],
	["string", () => " s "],
	["shared", () => ({ value: " a ", children: [leaf, leaf] })],
	["sharedBad", () => { const bad = { value: 1 }; return { value: " a ", children: [bad, bad] } }],
	["cyclic", () => { const c: any = { value: " c ", children: [] }; c.children.push(c); return c }],
	["cyclicBad", () => { const c: any = { value: 1, children: [] }; c.children.push(c); return c }],
	["cyclic2", () => { const a: any = { value: " a " }; const b: any = { value: " b ", children: [a] }; a.children = [b, b]; return a }],
	["deep", () => { let d: any = { value: " bottom " }; for (let i = 0; i < 80; i++) d = { value: " v ", children: [d] }; return d }],
	["deepBad", () => { let d: any = { value: 1 }; for (let i = 0; i < 80; i++) d = { value: " v ", children: [d] }; return d }],
	["wide", () => ({ value: " w ", children: Array.from({ length: 1200 }, () => ({ value: " e " })) })],
	["wideCyclic", () => { const c: any = { value: " c ", children: Array.from({ length: 1200 }, () => ({ value: " e " })) }; c.children.push(c); return c }]
]
for (const [name, T, wrap] of types) for (const [dataName, data] of datas) {
	run(() => [name, dataName, "call", printed(T(wrap(data()))), globalThis.calls])
	run(() => [name, dataName, "allows", T.allows(wrap(data())), globalThis.calls])
}
`,
	scopes: `
const printed = (v: any) => {
	if (v instanceof type.errors) return "ERR " + v.summary
	const ids = new Map()
	const p = (x: any): string => {
		if (typeof x !== "object" || x === null) return JSON.stringify(x) ?? String(x)
		if (ids.has(x)) return "#" + ids.get(x)
		ids.set(x, ids.size)
		return Array.isArray(x) ? "[" + x.map(p).join(",") + "]" : "{" + Object.keys(x).map(k => k + ":" + p(x[k])).join(",") + "}"
	}
	return p(v)
}
const $ = scope({
	A: { a: "string", "b?": "B" },
	B: { b: "string", "a?": "A", "c?": "C" },
	C: { c: "number", "cs?": "C[]" },
	Top: { a: "A", c: "C", n: "number" },
	Plain: { c: "C" },
	Trimmed: { t: "string.trim", "next?": "Trimmed" },
	AboveTrimmed: { t: "Trimmed", "ts?": "Trimmed[]", n: "number = 1" },
	U: "Trimmed | string",
	V: "A | B",
	AboveV: { v: "V" }
})
const m = $.export()
const types: [string, any, (d: any) => any][] = [
	["Top", m.Top, d => ({ a: { a: "a", b: { b: "b", a: { a: "a2" }, c: { c: 1, cs: [{ c: 2 }] } } }, c: { c: d }, n: 1 })],
	["Plain", m.Plain, d => ({ c: { c: d } })],
	["AboveTrimmed", m.AboveTrimmed, d => ({ t: { t: d } })],
	["AboveTrimmed.list", m.AboveTrimmed, d => ({ t: { t: " a " }, ts: [{ t: d }, { t: " b ", next: { t: d } }] })],
	["U", m.U, d => d],
	["U.object", m.U, d => ({ t: d })],
	["V", m.V, d => ({ a: d })],
	["V.b", m.V, d => ({ b: d })],
	["AboveV", m.AboveV, d => ({ v: { a: d } })],
	["AboveV.b", m.AboveV, d => ({ v: { b: d, a: { a: d } } })]
]
for (const [name, T, wrap] of types) for (const data of [" x ", 1, "abc", {}, null]) {
	run(() => [name, printed(T(wrap(data))), globalThis.calls])
	run(() => [name, T.allows(wrap(data)), globalThis.calls])
}
`,
	keywords: `
const K = type({ s: "string.trim", l: "string.lower", n: "string.numeric.parse", d: "string.date.parse", j: "string.json.parse" })
run(() => K({ s: " a ", l: "A", n: "1", d: "2020-01-01", j: "{}" }))
run(() => K({ s: 1, l: "A", n: "x", d: "nope", j: "{" }))
const Tr = type("string.trim").to("1 <= string <= 3")
run(() => Tr(" abc "))
run(() => Tr("    "))
run(() => type({ t: Tr, "o?": Tr, l: Tr.array() })({ t: "    ", o: "    ", l: ["   ", "a"] }))
const Cased = type("string.lower").pipe(size)
run(() => Cased("AB"))
const Described = Trim.to("string > 1").describe("a long trimmed")
run(() => Described(" a "))
run(() => Described(1))
run(() => type({ m: Described })({ m: " a " }))
run(() => type({ m: Described })({}))
const Configured = Trim.to(type("string > 1").configure({ message: "too short" }))
run(() => Configured(" a "))
run(() => type({ m: Configured })({ m: " a " }))
const MessageOn = Bounded.configure({ message: "bad" })
run(() => MessageOn("  "))
run(() => MessageOn(1))
run(() => type({ m: MessageOn })({ m: "  " }))
`
}

cases.thunks = `
const list = function () { globalThis.calls.push("list"); return [" a "] }
const Thunked = type({ t: Trim, l: ["string[]", "=", list], "m?": Bounded, n: ["number", "=", function () { globalThis.calls.push("n"); return 1 }], lit: "string = 'x'" })
run(() => Thunked({ t: " t " }))
run(() => Thunked({ t: " t ", l: ["b"], n: 2 }))
run(() => Thunked({ t: " t ", m: "  " }))
run(() => Thunked({ t: 1 }))
run(() => Thunked({ t: " t ", l: 1 }))
run(() => Thunked({ t: " t ", n: "x" }))
run(() => Thunked.allows({ t: " t " }))
const input = { t: "t" }
run(() => Object.keys(Thunked(input)))
run(() => Object.keys(input))
const Fail = type({ a: Trim, n: ["number", "=", function () { globalThis.calls.push("bad"); return "not a number" as never }] })
run(() => { try { return Fail({ a: " a " }) } catch (e) { return e.constructor.name } })
const Keys = type({ "a": ["string", "=", function () { globalThis.calls.push("a"); return "a" }], b: Trim, "c": "string = 'c'", "d": ["string", "=", function () { globalThis.calls.push("d"); return "d" }] })
run(() => Keys({ b: " b " }))
run(() => Object.keys(Keys({ b: " b " })))
const MorphedDefault = type({ s: ["string.trim", "=", " padded "] })
run(() => MorphedDefault({}))
run(() => MorphedDefault({ s: " in " }))
const ToDefault = type({ s: [Bounded, "=", " ab "] })
run(() => ToDefault({}))
run(() => ToDefault({ s: "    " }))
const Nested = type({ o: Thunked, l: Thunked.array() })
run(() => Nested({ o: { t: " t " }, l: [{ t: " t " }, { t: 1 }] }))
run(() => Nested({ o: { t: " t " }, l: [{ t: " t " }] }))
const Deleting = type({ "+": "delete", a: ["string", "=", function () { globalThis.calls.push("del"); return "d" }], b: Trim })
run(() => Deleting({ b: " b ", c: 1 }))
const Closed = type({ "+": "reject", a: ["string", "=", function () { globalThis.calls.push("cl"); return "d" }], b: Trim })
run(() => Closed({ b: " b " }))
run(() => Closed({ b: " b ", c: 1 }))
const Undefined = type({ "s?": "string", n: "number = 1" })
run(() => Undefined({ s: undefined }))
`

cases.deletingThunks = `
const a = function () { globalThis.calls.push("a"); return "a" }
const d = function () { globalThis.calls.push("d"); return "d" }
const Deleting = type({ "+": "delete", first: ["string", "=", a], b: Trim, "c?": Bounded, last: ["string", "=", d], lit: "string = 'x'", req: "string" })
run(() => Deleting({ b: " b ", req: "", other: 1 }))
run(() => Object.keys(Deleting({ b: " b ", req: "", other: 1 })))
run(() => Deleting({ b: " b ", c: "   ", req: "", other: 1 }))
run(() => Deleting({ b: 1, c: "   ", req: "", other: 1 }))
run(() => Deleting({ first: "f", b: " b ", last: "l", req: "" }))
class Holder { b = " b "; req = ""; other = 1 }
run(() => { const out = Deleting(new Holder()); return [out instanceof Holder, Object.keys(out), out.first, out.b] })
const Bad = type({ "+": "delete", n: ["number", "=", function () { globalThis.calls.push("bad"); return "x" as never }], p: Parsed })
run(() => { try { return Bad({ p: "1" }) } catch (e) { return e.constructor.name } })
run(() => { try { return Bad({ p: "x" }) } catch (e) { return e.constructor.name } })
const Deep = type({ list: Deleting.array(), o: { d: Deleting } })
run(() => Deep({ list: [{ b: " b ", req: "" }], o: { d: { b: " b ", req: "" } } }))
run(() => Deep({ list: [{ b: 1, req: "" }], o: { d: { b: " b ", c: "   ", req: "" } } }))
`
// enough transforming Types that a build writes checkers for a program this small
const morphFiller = Array.from(
	{ length: 60 },
	(_, i) => `export const M${i} = type({ m${i}: Trim, n${i}: "number > ${i}" })`
).join("\n")
cases.nullBranches = `
${morphFiller}
const shown = (out: any) => out instanceof type.errors ? out.summary : out
const Morphed = type("null").pipe(function () { globalThis.calls.push("m"); return { a: 1 } }).or("string")
const MorphedUndefined = type("undefined").pipe(function () { globalThis.calls.push("u"); return 1 }).or("string")
const Described = type("null").describe("nothing").or("string")
const ToObject = type("null").pipe(function () { return null }).to({ a: "unknown" }).or("object")
const Nested = type({ k: Morphed, j: Described.or("number") })
for (const T of [Morphed, MorphedUndefined, Described, ToObject]) for (const data of [null, undefined, "s", {}, 1]) {
	run(() => [shown(T(data)), globalThis.calls])
	run(() => [T.allows(data), globalThis.calls])
}
for (const data of [{ k: null, j: null }, { k: "s", j: 1 }, { k: 1, j: "s" }]) {
	run(() => [shown(Nested(data)), globalThis.calls])
	run(() => [Nested.allows(data), globalThis.calls])
}
`
cases.branchedPipes = `
${morphFiller}
const shown = (out: any) => out instanceof type.errors ? out.summary : out
class A { type = "a" }
class B { type = "b" }
class C { type = "c" }
const Thing = type.or(type.instanceOf(B), type.string.pipe(function () { globalThis.calls.push("s"); return new B() }), type.instanceOf(A).pipe(function () { globalThis.calls.push("a"); return new B() }))
const Keyed = type.or({ k: "'a'", v: type.instanceOf(A).pipe(function () { return 1 }) }, { k: "'b'" })
const Builtins = type.or(type.instanceOf(Date), "string.trim", type.instanceOf(RegExp).pipe(function () { globalThis.calls.push("r"); return 1 }))
const SameKey = type.or(type({ k: "'a'", n: "string" }).pipe(function () { globalThis.calls.push("x"); return 1 }), { k: "'a'", n: "number" }, { k: "'b'" })
for (const data of [new Date(0), /a/, " s ", 1]) {
	run(() => [shown(Builtins(data)), globalThis.calls])
	run(() => [shown(Builtins.allows(data)), globalThis.calls])
}
for (const data of [{ k: "a", n: "s" }, { k: "a", n: 1 }, { k: "a" }, { k: "b" }, { k: "c" }]) {
	run(() => [shown(SameKey(data)), globalThis.calls])
	run(() => [SameKey.allows(data), globalThis.calls])
}
const Inputs = [new A(), new B(), new C(), "s", 1, null]
for (const data of Inputs) {
	run(() => [shown(Thing(data)), globalThis.calls])
	run(() => [Thing.allows(data), globalThis.calls])
}
for (const data of [{ k: "a", v: new A() }, { k: "a", w: "s" }, { k: "a" }, { k: "b" }, { k: "c" }]) {
	run(() => [shown(Keyed(data)), globalThis.calls])
	run(() => [Keyed.allows(data), globalThis.calls])
}
`
cases.pipedReports = `
${morphFiller}
const shown = (out: any) => out instanceof type.errors ? out.issues.map((issue: any) => [issue.code, issue.path, issue.data, issue.message]) : out
const Handle = type("string").pipe(trim).narrow((s, ctx) => { globalThis.calls.push("h"); return /^@/.test(s) || ctx.mustBe("a handle") })
const Piped = type("string").pipe(trim).to(type("string").narrow((s, ctx) => { globalThis.calls.push("p"); return /^@/.test(s) || ctx.reject({ expected: "a handle", message: "bad" }) }))
const Reporting = type("string").narrow((s, ctx) => s.length > 1 || ctx.mustBe("long"))
const Transforming = type({ a: Trim, b: Reporting })
const ToStructure = type("string").pipe(function (s) { return { a: s, b: s } }).to(Transforming)
const Keyed = type({ k: Handle, "o?": Piped })
const Direct = type("string").narrow((s, ctx) => { globalThis.calls.push("d"); return s.length > 2 || ctx.mustBe("long") })
const Beside = type({ a: Direct, b: Trim, "c?": Direct.array() })
const Branch = Direct.or({ o: Direct })
for (const data of ["a", "abc", 1]) {
	run(() => [shown(Direct(data)), globalThis.calls])
	run(() => [Direct.allows(data), globalThis.calls])
	run(() => [shown(Beside({ a: data, b: "b", c: [data] })), globalThis.calls])
	run(() => [Beside.allows({ a: data, b: "b", c: [data] }), globalThis.calls])
	run(() => [shown(Branch(data)), globalThis.calls])
	run(() => [shown(Branch({ o: data })), globalThis.calls])
}
for (const data of [" a ", " @a ", 1]) {
	run(() => [shown(Handle(data)), globalThis.calls])
	run(() => [Handle.allows(data), globalThis.calls])
	run(() => [shown(Piped(data)), globalThis.calls])
	run(() => [shown(Keyed({ k: data, o: data })), globalThis.calls])
	run(() => [shown(ToStructure(data)), globalThis.calls])
}
`

// each with what shows a program's written as checkers
const themes: Record<string, [marker: string, names: string[]]> = {
	"unions and index signatures": [
		"indexed(",
		[
			"indexBoth",
			"discBool",
			"discBoolOne",
			"discBoolClosed",
			"discBoolDescribed",
			"discBoolString",
			"discBoolMissing",
			"discStringTrue",
			"discEscaped",
			"indexPlain",
			"indexSymbol",
			"indexPattern",
			"indexProps",
			"indexRequired",
			"indexReject",
			"indexRejectProps",
			"indexDescribed",
			"indexNarrowKey",
			"indexNarrowKeyReject",
			"indexErrors"
		]
	],
	"literal defaults": ["transformingProps(", ["literalDefaults"]],
	"function defaults": [
		"writtenBy(",
		[
			"defaultSharesRoot",
			"defaultFails",
			"thunks",
			"deletingThunks",
			"defaultKinds"
		]
	],
	morphs: [
		"morphing(",
		[
			"nullBranches",
			"branchedPipes",
			"indexes",
			"depths",
			"nullish",
			"returnsErrors",
			"heads",
			"closedAndDeleted",
			"unions",
			"pipedTo",
			"rangeUnion",
			"discBoolMorph",
			"indexMorphValue",
			"keywords"
		]
	],
	"callbacks reading a ctx": [
		"readingCtx(",
		[
			"pipedReports",
			"ctxNarrows",
			"allowsStopping",
			"indexCtxKey",
			"indexCtxKeyReject",
			"indexCtxKeyRejectNarrow",
			"indexCtxValue",
			"indexCtxValueKey"
		]
	],
	aliases: [
		"aliasedValue(",
		[
			"sharedAlias",
			"aliases",
			"scopes",
			"unionHoldingCycle",
			"indexAliasValue",
			"indexCycle"
		]
	]
}

contextualize(() => {
	for (const [theme, [marker, names]] of Object.entries(themes)) {
		describe(theme, () => {
			const root = writeFixture(
				{
					"helpers.ts": helpers,
					...Object.fromEntries(
						// a module alone writes checkers where they repay their runtime
						names.map((name, i) => [
							`${name}.ts`,
							moduleOf(cases[name]) + (i ? "" : repaying)
						])
					),
					"main.ts": `import { type } from "arktype"
${names.map(name => `import "./${name}.ts"`).join("\n")}
${repaying}
`
				},
				fromHere("temp", "checkerPrograms", theme.replace(/ /g, "-"))
			)
			let plain: string

			before(() => {
				plain = comparable(
					outputOf(["--conditions", "ark-ts", "--no-warnings", "main.ts"], {
						cwd: root
					})
				)
				attest(plain.includes("\n")).equals(true)
			})

			for (const [buildName, opts] of Object.entries(builds)) {
				it(buildName, async () => {
					const js = await bundle(root, opts)
					attest(js.includes(marker)).equals(true)
					attest(
						comparable(
							outputOf(["--conditions", "ark-ts", "--input-type=module"], {
								input: js,
								cwd: fromHere()
							})
						)
					).equals(plain)
				}).timeout(120_000)
			}
		})
	}
})
