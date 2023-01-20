import type { Identifier, ValidatorNode } from "../../nodes/node.ts"
import { nodeIsMorph, resolveIfIdentifier } from "../../nodes/resolve.ts"
import type { asOut } from "../../type.ts"
import { hasSubdomain } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { nominal } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export const parseMorphTuple: PostfixParser<"=>"> = (def, $) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedMorphExpressionMessage(def[2]))
    }
    const parsedInput = parseDefinition(def[0], $)
    const inputResolution = resolveIfIdentifier(parsedInput, $)
    const parsedMorph = def[2] as Morph
    return nodeIsMorph(inputResolution)
        ? {
              input: inputResolution.input,
              morph: hasSubdomain(inputResolution.morph, "Array")
                  ? [...inputResolution.morph, parsedMorph]
                  : [inputResolution.morph, parsedMorph]
          }
        : {
              input: parsedInput as Identifier | ValidatorNode,
              morph: parsedMorph
          }
}

export type Out<t = {}> = nominal<t, "out">

export type validateMorphTuple<def extends TupleExpression, $> = [
    _: validateDefinition<def[0], $>,
    _: "=>",
    _: Morph<
        asOut<inferDefinition<def[0], $>>,
        "3" extends keyof def ? inferDefinition<def[3], $> : unknown
    >,
    _?: validateDefinition<def[3], $>
]

export type Morph<i = any, o = unknown> = (In: i) => o

export type ParsedMorph<i = any, o = unknown> = (In: i) => Out<o>

export const writeMalformedMorphExpressionMessage = (value: unknown) =>
    `Morph expression requires a function following '=>' (was ${typeof value})`
