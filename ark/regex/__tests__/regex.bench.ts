import { bench } from "@ark/attest"
import { regex } from "@ark/regex"

bench.baseline(() => {
	regex("foo|^bar$|baz?")
})

bench("anchored union", () => {
	const r = regex("typescript|^go$|brrr$")
}).types([1650, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([383, "instantiations"])

bench("?(4)", () => {
	const r = regex("^a?b?c?d?$")
}).types([2425, "instantiations"])

bench("?(7)", () => {
	const r = regex("^a?b?c?d?e?f?g?$")
}).types([26615, "instantiations"])
