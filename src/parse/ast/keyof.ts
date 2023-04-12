import type { evaluate } from "../../utils/generics.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { writeImplicitNeverMessage } from "./intersection.js"
import type { PrefixParser } from "./tuple.js"

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) =>
    parseDefinition(def[1], ctx).keyOf()

export type inferKeyOfExpression<operandDef, $> = evaluate<
    keyof inferDefinition<operandDef, $>
>

export type validateKeyOfExpression<operandDef, $> = readonly [
    "keyof",
    inferKeyOfExpression<operandDef, $> extends never
        ? writeImplicitNeverMessage<[], "keyof">
        : validateDefinition<operandDef, $>
]
