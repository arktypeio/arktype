// @ts-nocheck
import { scope, type } from "arktype"
import { hasArkKind } from "../schema/out/shared/utils"

type("(boolean | number | 'foo')[]")

// = should be highlighted as normal
const t = type("(boolean | number | 'foo')[]")

type({
	foo: "string.normalize.NFC.preformatted"
})

const creditCard = type(
	"/^(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35d{3})d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))$/"
)

enum Foo {
	Bar
}

// Should be highlighted
Foo.BAR

type({
	a: "string|number[]"
})

export const tsGenerics = Scope.root({
	"Record<K, V>": node({ domain: "object" })
})

type(["string|numer", "[]"])

const a = "string"
const b = "boolean"
const c = "number"

const t = type(a).and(b).and(c)
const z = {
	a: true
}

const factor = (s: string) => s

// not highlighted
factor("foo|bar")
// not highglighted
or("foo|bar")

// THIS SHOULD NOT BE HIGHLIGHTED
// 	const t = type({
// 		[optional(s)]: "number"
// 	})

const lOrR = types.l.or(types.r)

// THIS SHOULD NOT BE HIGHLIGHTED
// attest(t.internal.indexableExpressions).snap()

// THIS SHOULD NOT BE HIGHLIGHTED AS A TYPE
hasArkKind("foo[]")

const foo = {
	bar: blah.bloo()
}

const aTypes = {
	a: type("string").anythingNotAKnownChainedMethod("")
}

// THIS SHOULD BE HIGHLIGHTED
for (const [name, schema] of Object.entries(aTypes)) {
}

const ff = type("string").or("foobar|baz")

const types = scope({ notASpace: { a: type("string") } }).export()
attest<Type<{ a: string }, Ark>>(types.notASpace)

test("type definition", () => {
	const types = scope({ a: type("string | number") }).export()
	attest<string>(types.a.infer)
	attest(() =>
		// @ts-expect-error
		scope({ a: type("strong") })
	).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
})

const $ = scope({
	b: "3.14",
	a: () => $.type("number").pipe(data => `${data}`),
	aAndB: () => $.type("a&b"),
	bAndA: () => $.type("b&a")
})

scope({
	// nested highlighting
	a: "string|number",
	b: [
		{
			nested: "a"
		}
	]
})

type({
	foo: "string[]"
})

{
	const type = (arg?: any) => {}
	type({
		foo: "string|number"
	})
	const obj = {
		type
	}
	obj.type({})
	// syntax should still be correctly highlighted
	const foo = {}

	const outer = (...args: any[]) => obj

	outer("ark", () => {
		const arkType = type({
			number: "number",
			negNumber: "number",
			maxNumber: "number",
			string: "string",
			longString: "string",
			boolean: "boolean",
			deeplyNested: {
				foo: "string",
				num: "number",
				bool: "boolean"
			}
		})
	}).type()
	const t = type(`${2}<Date<${4}`)

	const $ = scope({ a: "string" })
	const importer = $.scope({ b: "a" })

	const func = (f: any) => f
	const abc = func($.type("string"))
}

class F {
	static compile(rule: PropRule[]) {
		const named = rule.filter(isNamed)
		if (named.length === rule.length) {
			return this.compileNamed(named)
		}
		const indexed = rule.filter(isIndexed)
		return condition
	}
}

// This is used to generate highlighting.png
const highlighted = type({
	literals: "'foo' | 'bar' | true",
	expressions: "boolean[] | 5 < number <= 10 | number % 2",
	pattern: "/^(?:4[0-9]{12}(?:[0-9]{3,6}))$/",
	bar: "(string | number)[]"
})

// chained calls should be highlighted
highlighted.or("string[]").or({ object: "string[]" })
