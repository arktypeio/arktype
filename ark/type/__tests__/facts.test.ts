import { attest, contextualize } from "@ark/attest"
import { generic, Hkt, match, scope, type } from "arktype"
import { precompileUnits } from "./integration/precompiled.ts"

const testUrl = import.meta.url

let reads: string[] = []

const callSites = (): NodeJS.CallSite[] => {
	const { prepareStackTrace, stackTraceLimit } = Error
	Error.prepareStackTrace = (_, sites) => sites
	Error.stackTraceLimit = 50
	const holder = {} as { stack: NodeJS.CallSite[] }
	Error.captureStackTrace(holder, callSites)
	const sites = holder.stack
	Error.prepareStackTrace = prepareStackTrace
	Error.stackTraceLimit = stackTraceLimit
	return sites
}

// validating reads data however it likes, even while defining a type
const isTraversal = (site: NodeJS.CallSite) =>
	site.isEval() || /traverse/i.test(site.getFunctionName() ?? "")

const audit = (trap: string, k: unknown) => {
	const sites = callSites()
	if (sites.some(isTraversal)) return
	// skip audit and the trap that called it
	for (const site of sites.slice(2)) {
		const url = site.getFileName()
		if (!url?.startsWith("file:")) continue
		if (url === testUrl || url.endsWith("/ark/util/facts.ts")) return
		reads.push(
			`${trap}${typeof k === "string" || typeof k === "symbol" ? ` ${String(k)}` : ""} at ${url.slice(url.indexOf("/ark/") + 1)}:${site.getLineNumber()}`
		)
		return
	}
}

const traps = [
	"defineProperty",
	"deleteProperty",
	"get",
	"getOwnPropertyDescriptor",
	"getPrototypeOf",
	"has",
	"isExtensible",
	"ownKeys",
	"preventExtensions",
	"set",
	"setPrototypeOf"
] as const

// calls are effects rather than reads, so they pass through
const auditor: ProxyHandler<object> = Object.fromEntries(
	traps.map(trap => [
		trap,
		(target: object, ...args: unknown[]) => {
			audit(trap, args[0])
			return (Reflect[trap] as Function)(target, ...args)
		}
	])
)

const audited = <t extends object>(value: t): t => new Proxy<t>(value, auditor)

// what defining and printing each type reads from an audited value other than through @ark/util's facts
const readsOf = (...definitions: (() => unknown)[]): string[] => {
	reads = []
	for (const define of definitions) {
		try {
			const t: any = define()
			void t.expression
			void t.description
			void JSON.stringify(t.json)
			void t.toString()
		} catch {
			// a definition arktype rejects is audited up to the error
		}
	}
	return reads
}

class Foo {}
class Base {}
class Derived extends Base {}

contextualize(() => {
	it("reads no narrow or morph", () => {
		attest(
			readsOf(
				() => type("number").narrow(audited((n: number) => n > 0)),
				() => type(["number", ":", audited((n: number) => n > 0)]),
				() => type("string").pipe(audited((s: string) => s.length)),
				() => type("string").pipe.try(audited((s: string) => JSON.parse(s))),
				() => type(["string", "=>", audited((s: string) => s.trim())]),
				() =>
					type("string")
						.pipe(audited((s: string) => s.length))
						.or(type("number").pipe(audited((n: number) => `${n}`))),
				() =>
					type("string")
						.pipe(audited((s: string) => s.length))
						.to("number"),
				() =>
					type({ a: type("number").narrow(audited((n: number) => n > 0)) }).or({
						b: "string"
					}),
				() =>
					type.fn("string", ":", "number")(audited((s: string) => s.length)),
				() =>
					match({
						string: audited((s: string) => s.length),
						number: audited((n: number) => n + 1),
						default: "assert"
					})
			)
		).equals([])
	})

	it("reads no default", () => {
		attest(
			readsOf(
				() => type({ a: ["number", "=", audited(() => 5)] }),
				() => type({ a: [{ x: "string" }, "=", audited(() => ({ x: "a" }))] }),
				() => type({ a: ["number", "=", audited((_: unknown) => 5) as never] }),
				() => type({ a: [{ x: "string" }, "=", audited({ x: "a" }) as never] }),
				() => type({ a: type("number").default(audited(() => 7)) }),
				() => type(["string", ["number", "=", audited(() => 1)]]),
				() =>
					type({
						a: [type("string").pipe(audited((s: string) => s.length)), "=", "a"]
					}),
				() =>
					type({
						a: [type("number").narrow(audited((n: number) => n > 0)), "=", 5]
					}),
				() =>
					scope({
						"box<t>": { value: "t", tags: ["string[]", "=", audited(() => [])] }
					}).export().box
			)
		).equals([])
	})

	it("reads no default to key it for precompiled units", async () => {
		await precompileUnits([type({ unrelated: "string" })])
		attest(
			readsOf(() => type({ a: ["number", "=", audited(() => 5)] }))
		).equals([])
	})

	it("reads no class", () => {
		attest(
			readsOf(
				() => type.instanceOf(audited(Foo)),
				() => type(["instanceof", audited(Foo)]),
				() => type.instanceOf(audited(Date)),
				() =>
					type.instanceOf(audited(Base)).and(type.instanceOf(audited(Derived))),
				() => type(audited(Foo) as never)
			)
		).equals([])
	})

	it("reads no unit object", () => {
		const unit = audited({ a: 1 })
		attest(
			readsOf(
				() => type.unit(unit),
				() =>
					type.unit(
						audited({
							get a() {
								return 1
							}
						})
					),
				() => type.unit(audited({ toJSON: () => "a" })),
				() => type(["===", unit, audited({ b: 2 })]),
				() => type.enumerated(audited({}), 1, "a"),
				() => type.unit(audited(new Foo()))
			)
		).equals([])
	})

	it("reads no Standard Schema", () => {
		attest(
			readsOf(() =>
				type(
					audited({
						"~standard": {
							version: 1,
							vendor: "audit",
							validate: (value: unknown) => ({ value })
						}
					}) as never
				)
			)
		).equals([])
	})

	it("reads no thunk or mapper", () => {
		attest(
			readsOf(
				() => type(audited(() => type("string"))),
				() => type([audited(() => type("string")), "[]"] as never),
				() =>
					scope({ A: audited(() => type("string")), B: { a: "A" } }).export().B,
				() =>
					type("string").configure(
						audited((meta: object) => ({ ...meta, description: "mapped" }))
					),
				() =>
					type({ a: "string", b: "number" }).map(audited((prop: any) => prop)),
				() =>
					type("'a' | 'b'").distribute(
						audited((branch: any) => branch.expression),
						audited((branches: any[]) => branches.join())
					),
				() =>
					generic("t")(
						audited((args: any) => type({ box: args.t })) as never,
						audited(
							class extends Hkt {
								declare body: unknown
							}
						) as never
					)("string" as never),
				() =>
					scope(
						{ A: type("number").narrow(n => n > 0) },
						{ predicate: { description: audited(() => "positive") } }
					).export().A
			)
		).equals([])
	})

	it("reads no error writer", () => {
		attest(
			readsOf(
				() =>
					type("string").configure({
						message: audited((ctx: any) => `${ctx.actual} is not a string`)
					}),
				() => type("string").configure({ onFail: audited(() => {}) } as never),
				() =>
					type({
						a: [
							type("number").configure({
								expected: audited(() => "a number"),
								actual: audited(() => "something else")
							}),
							"=",
							"a" as never
						]
					})
			)
		).equals([])
	})

	it("reads no narrow of a literal", () => {
		attest(
			readsOf(
				() =>
					type
						.unit(5)
						.and(type("number").narrow(audited((n: number) => n > 0))),
				() =>
					type
						.Record(
							type("string").narrow(audited((k: string) => k.length < 5)),
							"number"
						)
						.and({ a: "number" }),
				() =>
					scope(
						{
							T: {
								"a?": type("number").narrow(audited((n: unknown) => n !== 0))
							}
						},
						{ exactOptionalPropertyTypes: false }
					).export().T
			)
		).equals([])
	})
})
