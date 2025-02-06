import { bench } from "@ark/attest"
import { match, type } from "arktype"

const disappointingGift = type({
	label: "string",
	"box?": "this"
})

const out = disappointingGift({
	label: "foo",
	box: { label: "bar", box: {} }
})

if (out instanceof type.errors) {
	// ArkErrors: box.box.label must be a string (was missing)
	console.error(out.summary)
} else {
	console.log(out.box?.box?.label)
}

// bench("morph", () => {
// 	type.keywords.string.numeric.parse("5")
// }).mean()

// const t = type({
// 	"+": "delete",
// 	a: "string"
// })

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
