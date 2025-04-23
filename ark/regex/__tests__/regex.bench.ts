import { bench } from "@ark/attest"
import { regex } from "@ark/regex"

bench.baseline(() => {
	regex("foo|^bar$")
})

bench("string", () => {
	regex("typescript|^go$|brrr$")
}).types([725, "instantiations"])
