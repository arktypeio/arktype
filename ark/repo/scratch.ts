import { type } from "arktype"

const identical = type({
	grouping: "(0 | (1 | (2 | (3 | (4 | 5)[])[])[])[])[]",
	nestedGenerics:
		"Extract<Record<string, unknown> | boolean | null | unknown[], object>"
})

// fully reduced inference
// and fully runtime introspectable
console.log(identical.get("grouping").expression)
console.log(identical.get("nestedGenerics").expression)
