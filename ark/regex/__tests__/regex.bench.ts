import { bench } from "@ark/attest"
import { regex } from "@ark/regex"

bench("string", () => {
	regex("typescript|^go$|brrr$")
}).types([712, "instantiations"])
