// run without a driver, pairing each of arktype's Types with another that stands in for its validator and diverges
import { shadow } from "@ark/precompile/shadow"
import { type } from "arktype"

const outcomeOf = (run: () => unknown) => {
	try {
		return run()
	} catch (e) {
		return String(e)
	}
}

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

console.log(
	JSON.stringify({
		validated: outcomeOf(() => validated(2)),
		called: outcomeOf(() => called("abc")),
		shared: outcomeOf(() => shared({})),
		length: outcomeOf(() => length("abc")),
		bumped: outcomeOf(() => bumped(new Counter()))
	})
)
