import { bench } from "@arktype/attest"
import { schema } from "@arktype/schema"

bench("domain", () => schema("string").infer).types([2, "instantiations"])

bench("intersection", () => schema("string").and(schema("number"))).types([
	846,
	"instantiations"
])

bench("no assignment", () => {
	schema({ domain: "string", pattern: "/.*/" })
}).types([350, "instantiations"])
