import { bench } from "@ark/attest"
import { regex } from "@ark/regex"

bench.baseline(() => {
	regex("foo|^bar$|baz?")
})

bench("anchored union", () => {
	const r = regex("typescript|^go$|brrr$")
}).types([1523, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([403, "instantiations"])

bench("?(5)", () => {
	const r = regex("^a?b?c?d?e?$")
}).types([5169, "instantiations"])
