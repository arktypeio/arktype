import { cached } from "@arktype/utils"
import { node } from "../parse.js"
import { arrayIndexInput } from "../props/indexed.js"
import type { TypeNode } from "../type.js"

export const builtins = {
    never: cached(() => node()),
    unknown: cached(() => node({})),
    nonVariadicArrayIndex: cached(() => node(arrayIndexInput())),
    string: cached(() => node({ basis: "string" })),
    array: cached(() => node({ basis: Array }))
} satisfies Record<string, () => TypeNode>
