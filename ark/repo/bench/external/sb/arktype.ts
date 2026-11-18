// schema-benchmarks' arktype entry, its validation section verbatim: bundle.ts
// builds it as is (dynamic) and precompiled (b1)
import { defineBenchmarks } from "#src"
import { getArkTypeSchema } from "./arktypeSchema.ts"

const schema = getArkTypeSchema()

export default defineBenchmarks({
	library: { name: "arktype", optimizeType: "jit", version: "rc" },
	validation: {
		run: data => schema.allows(data),
		snippet: "schema.allows(data)"
	}
})
