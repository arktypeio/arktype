import { bench } from "@ark/attest"
import { regex } from "@ark/regex"
import type { repeat } from "@ark/util"

bench.baseline(() => {
	regex("foo|^bar$|baz?")
})

bench("anchored union", () => {
	const r = regex("typescript|^go$|brrr$")
}).types([2870, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([574, "instantiations"])

bench("?(4)", () => {
	const r = regex("^a?b?c?d?$")
}).types([1706, "instantiations"])

bench("?(7)", () => {
	const r = regex("^a?b?c?d?e?f?g?$")
}).types([4522, "instantiations"])

bench("escape(6)", () => {
	const r = regex("^\t\n\r\v\f\0$")
}).types([1144, "instantiations"])
