import { cached } from "@arktype/util"
import { node } from "./old/parse.js"
import { arrayIndexInput } from "./old/prop/indexed.js"
import type { TypeNode } from "./old/type.js"

// TODO: integrate with default scopes
export const builtins = {
	never: cached(() => node([])),
	unknown: cached(() => node({})),
	nonVariadicArrayIndex: cached(() => node(arrayIndexInput())),
	string: cached(() => node({ basis: "string" })),
	array: cached(() => node({ basis: Array }))
} satisfies Record<string, () => TypeNode>
