import { bench } from "@ark/attest"
import { regex } from "@ark/regex"
import type { repeat } from "@ark/util"

bench.baseline(() => {
	regex("foo|^bar$|baz?")
})

bench("anchored union", () => {
	const r = regex("typescript|^go$|brrr$")
}).types([2469, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([643, "instantiations"])

bench("?(4)", () => {
	const r = regex("^a?b?c?d?$")
}).types([1866, "instantiations"])

bench("?(7)", () => {
	const r = regex("^a?b?c?d?e?f?g?$")
}).types([4987, "instantiations"])

bench("escape(6)", () => {
	const r = regex("^\t\n\r\v\f\0$")
}).types([1001, "instantiations"])
