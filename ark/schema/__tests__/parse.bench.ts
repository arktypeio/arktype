import { bench } from "@ark/attest"
import { schema } from "@ark/schema"

bench("domain", () => schema("string").infer).types([2, "instantiations"])

bench("intersection", () => schema("string").and(schema("number"))).types([
	846,
	"instantiations"
])

bench("no assignment", () => {
	schema({ domain: "string", pattern: "/.*/" })
}).types([350, "instantiations"])
