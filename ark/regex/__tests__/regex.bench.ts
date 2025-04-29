import { bench } from "@ark/attest"
import { regex } from "@ark/regex"

bench.baseline(() => {
	regex("foo|^bar$|baz?")
})

bench("anchored union", () => {
	const r = regex("typescript|^go$|brrr$")
}).types([2215, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([511, "instantiations"])

bench("?(4)", () => {
	const r = regex("^a?b?c?d?$")
}).types([3136, "instantiations"])

bench("?(7)", () => {
	const r = regex("^a?b?c?d?e?f?g?$")
}).types([31598, "instantiations"])
