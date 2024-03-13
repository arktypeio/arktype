import { bench } from "@arktype/attest"
import { schema } from "arktype"
import type { Node } from "../../base.js"
import type { TypeKind } from "../../shared/implement.js"
import type { Type } from "../../types/type.js"

bench("domain", () => {
	return schema("string").infer
}).types([2, "instantiations"])

bench("intersection", () => {
	return schema("string").and(schema("number"))
}).types([846, "instantiations"])

bench("no assignment", () => {
	schema({ domain: "string", regex: "/.*/" })
}).types([350, "instantiations"])
