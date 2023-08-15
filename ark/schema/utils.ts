import { cached } from "@arktype/util"

// TODO: integrate with default scopes
export const builtins = {
	never: cached(() => node([])),
	unknown: cached(() => node({})),
	nonVariadicArrayIndex: cached(() => node(arrayIndexInput())),
	string: cached(() => node({ basis: "string" })),
	array: cached(() => node({ basis: Array }))
} satisfies Record<string, () => TypeNode>
