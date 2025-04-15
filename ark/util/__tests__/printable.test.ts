import { attest, contextualize } from "@ark/attest"
import { printable } from "@ark/util"

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
		attest(printable(d)).snap("10:30:15.123 AM, October 3, 2023")
	})

	it("date only year", () => {
		const d = new Date("2023-01-01T00:00:00.000Z")
		attest(printable(d)).snap("7:00 PM, December 31, 2022")
	})

	it("date only date", () => {
		const d = new Date("2023-05-15T00:00:00.000Z")
		attest(printable(d)).snap("8:00 PM, May 14, 2023")
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
})
