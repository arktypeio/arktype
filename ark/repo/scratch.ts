import { type } from "arktype"

interface RuntimeErrors extends type.errors {
	/**even must be even (was 7)
odd must be odd (was 8)*/
	summary: string
}

const narrowMessage = (e: type.errors): e is RuntimeErrors => true
// ---cut---

// there's no "not divisible" expression - need to narrow
const odd = type("number").narrow((n, ctx) =>
	// if even, add a customizable error and return false
	n % 2 === 0 ? ctx.mustBe("odd") : true
)

const favoriteNumbers = type({
	even: "number % 2",
	odd
})

const out = favoriteNumbers({
	even: 7,
	odd: 8
})

if (out instanceof type.errors) {
	// ---cut-start---
	if (!narrowMessage(out)) throw new Error()
	// ---cut-end---
	// hover summary to see validation errors
	console.error(out.summary)
} else {
	console.log(out.odd)
}

// bench("morph", () => {
// 	type.keywords.string.numeric.parse("5")
// }).mean()

const t = type({
	"+": "delete",
	a: "string"
})

// bench("good", () => {
// 	t({ a: "foo" })
// }).mean([253.32, "ns"])

// bench("delete one", () => {
// 	t({ a: "foo", b: true })
// }).mean([2.59, "us"])

// bench("delete five", () => {
// 	t({ a: "foo", b: true, c: true, d: true, e: true, f: true })
// }).mean([6.1, "us"])

// const m = match
// 	.case("31", n => `${n}` as const)
// 	.case("32", n => `${n}` as const)
// 	.case("33", n => `${n}` as const)
// 	.default("assert")

// bench("match", () => {
// 	m(31)
// 	m(32)
// 	m(33)
// }).mean()
