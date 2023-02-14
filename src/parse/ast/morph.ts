import type { Branch, MorphBranch } from "../../nodes/branch.ts"
import { isMorphBranch } from "../../nodes/branch.ts"
import type { ResolvedNode } from "../../nodes/node.ts"
import type { asIn, asOut } from "../../scopes/type.ts"
import type { Problem, Problems } from "../../traverse/problems.ts"
import type { Domain } from "../../utils/domains.ts"
import { throwInternalError, throwParseError } from "../../utils/errors.ts"
import type { mutable, nominal } from "../../utils/generics.ts"
import { isArray } from "../../utils/objectKinds.ts"
import { stringify } from "../../utils/serialize.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export const parseMorphTuple: PostfixParser<"|>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedMorphExpressionMessage(def[2]))
    }
    const resolution = ctx.type.meta.scope.resolveNode(
        parseDefinition(def[0], ctx)
    )
    const morph = def[2] as Morph
    ctx.type.meta.includesMorph = true
    let domain: Domain
    const result: mutable<ResolvedNode> = {}
    for (domain in resolution) {
        const predicate = resolution[domain]
        if (predicate === true) {
            result[domain] = { rules: {}, morph }
        } else if (typeof predicate === "object") {
            result[domain] = isArray(predicate)
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

const applyMorph = (branch: Branch, morph: Morph): MorphBranch =>
    isMorphBranch(branch)
        ? {
              ...branch,
              morph: branch.morph
                  ? Array.isArray(branch.morph)
                      ? [...branch.morph, morph]
                      : [branch.morph, morph]
                  : morph
          }
        : {
              rules: branch,
              morph
          }

export type Out<t = {}> = nominal<t, "out">

export type validateMorphTuple<def extends TupleExpression, $> = readonly [
    _: validateDefinition<def[0], $>,
    _: "|>",
    _: Morph<asOut<inferDefinition<def[0], $>>, unknown>
]

export type Morph<i = any, o = unknown> = (In: i, problems: Problems) => o

export type ParsedMorph<i = any, o = unknown> = (In: i) => inferMorphOut<o>

export type inferMorph<inDef, morph, $> = morph extends Morph
    ? (In: asIn<inferDefinition<inDef, $>>) => inferMorphOut<ReturnType<morph>>
    : never

type inferMorphOut<out> = unknown extends out
    ? Out<unknown> | undefined | null
    :
          | Out<Exclude<out, Problem | undefined | null>>
          | Extract<out, undefined | null>

export const writeMalformedMorphExpressionMessage = (value: unknown) =>
    `Morph expression requires a function following '|>' (was ${typeof value})`
