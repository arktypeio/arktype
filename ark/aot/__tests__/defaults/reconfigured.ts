import { scope } from "arktype"

// its answer is fixed per configuration, read from the traversal's
const isLoose = (
	n: number,
	ctx: { config: { domain: { expected: unknown } } }
) => ctx.config.domain.expected !== "strict"

const $loose = scope(
	{ n: ["number", ":", isLoose] },
	{ domain: { expected: "loose" } }
)
const $strict = scope(
	{ n: ["number", ":", isLoose] },
	{ domain: { expected: "strict" } }
)

export const Loose = $loose.type({ p: ["n", "=", 5] })
// an equal check in another configuration, which arktype runs again and which throws
export const Strict = $strict.type({ p: ["n", "=", 5] })
