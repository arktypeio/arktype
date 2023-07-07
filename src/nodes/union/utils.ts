import { cached } from "@arktype/utils"
import { arrayIndexInput } from "../properties/indexed.js"
import type { TypeNode } from "../type.js"
import { node } from "./parse.js"

export const builtins = {
    never: cached(() => node()),
    unknown: cached(() => node({})),
    nonVariadicArrayIndex: cached(() => node(arrayIndexInput())),
    string: cached(() => node({ basis: "string" })),
    array: cached(() => node({ basis: Array }))
} satisfies Record<string, () => TypeNode>
