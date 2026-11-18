import type { StandardJSONSchemaV1 } from "@ark/schema"

// stands in for a zod schema, which reads its JSON Schema the same way
export const standardSchema = (
	input: object,
	output: object = input
): StandardJSONSchemaV1 & { targets: string[] } => {
	const targets: string[] = []
	return {
		targets,
		"~standard": {
			version: 1,
			vendor: "zod",
			jsonSchema: {
				input: opts => (targets.push(opts.target), input as never),
				output: opts => (targets.push(opts.target), output as never)
			}
		}
	}
}
