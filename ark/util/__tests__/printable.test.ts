import { attest, contextualize } from "@ark/attest"
import { hasOwn, printable, snapshot } from "@ark/util"

contextualize(() => {
	it("primitives", () => {
		attest(printable(5)).snap("5")
		attest(printable("foo")).snap('"foo"')
		attest(printable(true)).snap("true")
		attest(printable(null)).snap("null")
		attest(printable(undefined)).snap("undefined")
		attest(printable(123n)).snap("123n")
		const s = Symbol("ark")
		attest(printable(s)).snap("Symbol(ark)")
	})

	it("simple object", () => {
		const data = { a: 1, b: "foo" }
		attest(printable(data)).snap('{"a":1,"b":"foo"}')
	})

	it("simple array", () => {
		const data = [1, "foo"]
		attest(printable(data)).snap('[1,"foo"]')
	})

	it("bigint in array", () => {
		const data = [1n, 0n, -1n]
		attest(printable(data)).snap("[1n,0n,-1n]")
	})

	it("bigint in object", () => {
		const data = { a: 1n, b: 2n }
		attest(printable(data)).snap('{"a":1n,"b":2n}')
	})

	it("undefined in array", () => {
		const data = [undefined, "undefined"]
		attest(printable(data)).snap('[undefined,"undefined"]')
	})

	it("undefined in object", () => {
		const data = { a: undefined, b: "undefined" }
		attest(printable(data)).snap('{"a":undefined,"b":"undefined"}')
	})

	it("nested", () => {
		const data = { a: [1, { b: "foo" }] }
		attest(printable(data)).snap('{"a":[1,{"b":"foo"}]}')
	})

	it("indent", () => {
		const data = { a: [1, { b: "foo" }] }
		attest(printable(data, { indent: 2 })).snap(`{
  "a": [
    1,
    {
      "b": "foo"
    }
  ]
}`)
	})

	it("quoteKeys: false", () => {
		const data = { a: 1, b: "foo" }
		attest(printable(data, { quoteKeys: false })).snap('{a: 1, b: "foo"}')
	})

	it("quoteKeys: false, indent", () => {
		const data = { a: [1, { b: "foo" }] }
		attest(printable(data, { indent: 2, quoteKeys: false })).snap(`{
  a: [
    1,
    {
      b: "foo"
    }
  ]
}`)
	})

	it("quoteKeys: false, non-identifier key", () => {
		const data = { "a-b": 1 }
		attest(printable(data, { quoteKeys: false })).snap('{"a-b": 1}')
	})

	it("quoteKeys: false, symbol key", () => {
		const s = Symbol("symbolNoQuote")
		const data = { [s]: 1 }
		attest(printable(data, { quoteKeys: false })).snap(
			"{Symbol(symbolNoQuote): 1}"
		)
	})

	it("quoteKeys: false, indent, symbol key", () => {
		const s = Symbol("symbolNoQuoteIndent")
		const data = { [s]: { nested: true } }
		attest(printable(data, { indent: 2, quoteKeys: false })).snap(`{
  Symbol(symbolNoQuoteIndent): {
    nested: true
  }
}`)
	})

	it("cycle", () => {
		const data: any = { a: 1 }
		data.cycle = data
		attest(printable(data)).snap('{"a":1,"cycle":"(cycle)"}')
	})

	it("cycle array", () => {
		const data: any[] = [1]
		data.push(data)
		attest(printable(data)).snap('[1,"(cycle)"]')
	})

	it("function", () => {
		const printableFunctionTest = () => {}
		attest(printable(printableFunctionTest)).snap(
			"Function(printableFunctionTest)"
		)
	})

	it("date", () => {
		const d = new Date("2023-10-03T14:30:15.123Z")
		attest(printable(d)).snap("October 3, 2023, 2:30:15.123 PM UTC")
		attest(printable(new Date(NaN))).snap("Invalid Date")
	})

	it("instance with expression", () => {
		class Type {
			expression = "number > 5"
		}
		attest(printable(new Type())).snap("number > 5")
	})

	it("custom constructor", () => {
		class MyClass {}
		const instance = new MyClass()
		attest(printable(instance)).snap("MyClass")
	})

	it("object with toJSON", () => {
		const obj = {
			a: 1,
			toJSON: () => ({ b: 2 })
		}
		attest(printable(obj)).snap('{"b":2}')
	})

	it("preserves own __proto__ without polluting snapshot prototype", () => {
		const input = JSON.parse('{"__proto__": {"polluted": 1}, "a": 2}')
		attest(printable(input)).equals('{"__proto__":{"polluted":1},"a":2}')

		const snap = snapshot(input) as Record<string, unknown>
		attest(Object.getPrototypeOf(snap)).is(Object.prototype)
		attest(hasOwn(snap, "__proto__")).equals(true)
		attest("polluted" in snap).equals(false)
		attest(Object.getOwnPropertyDescriptor(snap, "__proto__")?.value).equals({
			polluted: 1
		})
	})

	it("snapshot honors onFunction, onCycle, and onSymbol options", () => {
		const symKey = Symbol("key")
		const symVal = Symbol("val")
		const namedFn = () => {}
		const cyc: Record<PropertyKey, unknown> = {
			fn: namedFn,
			sym: symVal,
			[symKey]: 1
		}
		cyc.self = cyc

		const result = snapshot(cyc, {
			onFunction: fn => `fn:${fn.name}`,
			onCycle: () => "custom-cycle",
			onSymbol: s => `sym:${s.description}`
		})
		attest(result).equals({
			fn: "fn:namedFn",
			sym: "sym:val",
			self: "custom-cycle",
			"sym:key": 1
		} as never)
	})

	it("handles circular values with quoteKeys: false and constructor getters with ownDataOnly", () => {
		const cyc: Record<string, unknown> = { a: 1 }
		cyc.self = cyc
		attest(printable(cyc, { quoteKeys: false })).snap("{a: 1, self: (cycle)}")
		attest(printable([1, 2], { quoteKeys: false })).snap("[1, 2]")

		const throwingCtor = Object.defineProperty({ a: 1 }, "constructor", {
			get() {
				throw new Error("ctor-boom")
			},
			enumerable: false
		})
		attest(printable(throwingCtor, { ownDataOnly: true })).snap('{"a":1}')

		class Custom {}
		const customThrowingCtor = Object.defineProperty(
			new Custom(),
			"constructor",
			{
				get() {
					throw new Error("ctor-boom")
				},
				enumerable: false
			}
		)
		attest(printable(customThrowingCtor, { ownDataOnly: true })).snap("Custom")

		class SubArray extends Array {}
		attest(printable(new SubArray(), { ownDataOnly: true })).snap("[]")
		attest(printable(() => [], { ownDataOnly: true })).snap("Function(fn)")
	})
})
