import { bench } from "@ark/attest"
import { regex } from "@ark/regex"

bench.baseline(() => {
	regex("foo|^bar$")
})

bench("anchored union", () => {
	regex("typescript|^go$|brrr$")
}).types([1523, "instantiations"])

bench("?", () => {
	regex("a?")
}).types([360, "instantiations"])
