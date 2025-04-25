import { bench } from "@ark/attest"
import { regex } from "@ark/regex"

bench.baseline(() => {
	regex("foo|^bar$|baz?")
})

bench("anchored union", () => {
	const r = regex("typescript|^go$|brrr$")
}).types([2010, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([456, "instantiations"])

bench("?(4)", () => {
	const r = regex("^a?b?c?d?$")
}).types([3039, "instantiations"])

bench("?(7)", () => {
	const r = regex("^a?b?c?d?e?f?g?$")
}).types([31459, "instantiations"])
