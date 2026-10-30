// run without a driver, pairing each Type with a diverging stand-in
import { shadow, shadowUnder } from "@ark/aot/shadow"
import { scope, type, type Traversal } from "arktype"
import "arktype/errors"

// each mismatch, which shadow mode raises again where it can't be caught
const reported: string[] = []
process.on("uncaughtException", e => reported.push(String(e)))

const outcomeOf = (run: () => unknown) => {
	try {
		return run()
	} catch (e) {
		return String(e)
	}
}

// a validator for a definition arktype can't parse
const unparsed = () =>
	shadow(
		"unparsed",
		() => type("string > 0"),
		() => type("0 < string" as never),
		[]
	)

const isA = (s: string) => s.startsWith("a")

class Counter {
	count = 1
}

const validated = shadow(
	"validated",
	() => type("number").narrow(n => n > 2),
	() => type("number").narrow(n => n > 1),
	[]
) as type.Any

const called = shadow(
	"called",
	(f: unknown) => type("string").narrow(s => (f as typeof isA)(`${s}!`)),
	(f: unknown) => type("string").narrow(s => (f as typeof isA)(s)),
	[0],
	isA
) as type.Any

const isFirst = (s: string, ctx: { hasError: () => boolean }) =>
	!ctx.hasError() && s.length > 0

// a validator whose ctx holds an error where arktype's doesn't as it calls isFirst
const checked = shadow(
	"checked",
	(f: unknown) =>
		type("string").narrow(
			(s, ctx) => (
				ctx.reject("an earlier problem"),
				(f as typeof isFirst)(s, ctx)
			)
		),
	(f: unknown) =>
		type("string").narrow((s, ctx) => (f as typeof isFirst)(s, ctx)),
	[0],
	isFirst
) as type.Any

const shared = shadow(
	"shared",
	() => type("object").pipe(o => ({ a: o, b: { ...o } })),
	() => type("object").pipe(o => ({ a: o, b: o })),
	[]
) as type.Any

const length = shadow(
	"length",
	() => type.fn("string", ":", "number")(s => s.length + 1),
	() => type.fn("string", ":", "number")(s => s.length),
	[]
) as (s: string) => number

const bumped = shadow(
	"bumped",
	() => type({ count: "number" }).pipe(counter => (counter.count += 2)),
	() => type({ count: "number" }).pipe(counter => ++counter.count),
	[]
) as type.Any

const isSame = (o: { a: object; b: object }) => o.a === o.b

// a validator passing isSame one object where arktype passes two
const aliased = shadow(
	"aliased",
	(f: unknown) =>
		type("object")
			.pipe(() => {
				const o = {}
				return { a: o, b: o }
			})
			.pipe(f as typeof isSame),
	(f: unknown) =>
		type("object")
			.pipe(() => ({ a: {}, b: {} }))
			.pipe(f as typeof isSame),
	[0],
	isSame
) as type.Any

const isFlagged = (s: string, ctx: Traversal) => "flag" in (ctx.root as object)

// a validator whose ctx holds another root as it calls isFlagged
const rooted = shadow(
	"rooted",
	(f: unknown) =>
		type({
			a: type("string").narrow(
				(s, ctx) => ((ctx.root = { flag: 1 }), (f as typeof isFlagged)(s, ctx))
			)
		}),
	(f: unknown) =>
		type({
			a: type("string").narrow((s, ctx) => (f as typeof isFlagged)(s, ctx))
		}),
	[0],
	isFlagged
) as type.Any

const first = scope({}, { errors: "first" })

// a first-issue validator returning another of the issues arktype finds
const reordered = shadowUnder(
	{ errors: "first" },
	"reordered",
	() => first.type({ b: "number" }),
	() => first.type({ a: "string[]", b: "number" }),
	[]
) as type.Any

const caught = {
	unparsed: outcomeOf(unparsed),
	validated: outcomeOf(() => validated(2)),
	called: outcomeOf(() => called("abc")),
	checked: outcomeOf(() => checked("abc")),
	shared: outcomeOf(() => shared({})),
	length: outcomeOf(() => length("abc")),
	bumped: outcomeOf(() => bumped(new Counter())),
	aliased: outcomeOf(() => aliased({})),
	rooted: outcomeOf(() => rooted({ a: "x" })),
	reordered: outcomeOf(() => String(reordered({ a: [1], b: "2" }))),
	// as a fallback or `expect(...).toThrow()` would
	swallowed: (() => {
		try {
			return validated.assert(2)
		} catch {
			return "fallback"
		}
	})()
}

await new Promise(resolve => setTimeout(resolve))

console.log(JSON.stringify({ ...caught, reported }))
