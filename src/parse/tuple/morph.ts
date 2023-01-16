import type { asOut } from "../../type.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { nominal } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export const parseMorphTuple: PostfixParser<"=>"> = (def, $) => {
    const inputNode = parseDefinition(def[0], $)
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedMorphExpressionMessage(def[2]))
    }
    return {
        input: inputNode,
        morph: def[2] as Morph
    }
}

export type Out<t = {}> = nominal<t, "out">

export type validateMorphTuple<def extends TupleExpression, $> = [
    _: validateDefinition<def[0], $>,
    _: "=>",
    _: Morph<asOut<inferDefinition<def[0], $>>>,
    _?: validateDefinition<def[3], $>
]

export type Morph<i = any, o = unknown> = (In: i) => o

export type ParsedMorph<i = any, o = unknown> = (In: i) => Out<o>

export const writeMalformedMorphExpressionMessage = (value: unknown) =>
    `Morph expression requires a function following '=>' (was ${typeof value})`
