import type { asOut } from "../../main.ts"
import type { ResolvedNode } from "../../nodes/node.ts"
import type { Branch } from "../../nodes/predicate.ts"
import type { Domain } from "../../utils/domains.ts"
import { hasSubdomain } from "../../utils/domains.ts"
import { throwInternalError, throwParseError } from "../../utils/errors.ts"
import type { mutable, nominal } from "../../utils/generics.ts"
import { stringify } from "../../utils/serialize.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export const parseMorphTuple: PostfixParser<"=>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedMorphExpressionMessage(def[2]))
    }
    const resolution = ctx.$.resolveNode(parseDefinition(def[0], ctx))
    const morph = def[2] as Morph
    let domain: Domain
    const result: mutable<ResolvedNode> = {}
    for (domain in resolution) {
        const predicate = resolution[domain]
        if (predicate === true) {
            result[domain] = { input: {}, morph }
        } else if (typeof predicate === "object") {
            result[domain] = hasSubdomain(predicate, "Array")
                ? predicate.map((branch) => applyMorph(branch, morph))
                : applyMorph(predicate, morph)
        } else {
            throwInternalError(
                `Unexpected predicate value for domain '${domain}': ${stringify(
                    predicate
                )}`
            )
        }
    }
    return result
}

const applyMorph = (branch: Branch, morph: Morph) =>
    branch.morph
        ? {
              input: branch.input,
              morph: Array.isArray(branch.morph)
                  ? [...branch.morph, morph]
                  : [branch.morph, morph]
          }
        : {
              input: branch,
              morph
          }

export type Out<t = {}> = nominal<t, "out">

export type validateMorphTuple<def extends TupleExpression, $> = readonly [
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
