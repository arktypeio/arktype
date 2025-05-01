import { bench } from "@ark/attest"
import { regex } from "@ark/regex"

bench.baseline(() => {
	regex("foo|^bar$|baz?")
})

bench("anchored union", () => {
	const r = regex("typescript|^go$|brrr$")
}).types([2097, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([477, "instantiations"])

bench("?(4)", () => {
	const r = regex("^a?b?c?d?$")
}).types([3072, "instantiations"])

bench("?(7)", () => {
	const r = regex("^a?b?c?d?e?f?g?$")
}).types([31504, "instantiations"])

bench("escape(6)", () => {
	const r = regex("^\t\n\r\v\f\0$")
}).types([818, "instantiations"])
