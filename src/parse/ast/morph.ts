import type { Branch, MetaBranch } from "../../nodes/branch.js"
import { isTransformationBranch } from "../../nodes/branch.js"
import type { TypeNode } from "../../nodes/node.js"
import type { asIn, asOut } from "../../scopes/type.js"
import type { Problem, Problems } from "../../traverse/problems.js"
import type { CheckResult } from "../../traverse/traverse.js"
import type { Domain } from "../../utils/domains.js"
import { throwInternalError, throwParseError } from "../../utils/errors.js"
import type { mutable } from "../../utils/generics.js"
import { isArray } from "../../utils/objectKinds.js"
import { stringify } from "../../utils/serialize.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { PostfixParser, TupleExpression } from "./tuple.js"

export const parseMorphTuple: PostfixParser<"|>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedMorphExpressionMessage(def[2]))
    }
    const node = parseDefinition(def[0], ctx)
    const resolution = ctx.type.scope.resolveTypeNode(node)
    const morph = def[2] as Morph
    ctx.type.includesMorph = true
    let domain: Domain
    const result: mutable<TypeNode> = {}
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

const applyMorph = (branch: Branch, morph: Morph): MetaBranch =>
    isTransformationBranch(branch)
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

export type validateMorphTuple<def extends TupleExpression, $> = readonly [
    _: validateDefinition<def[0], $>,
    _: "|>",
    _: Morph<asOut<inferDefinition<def[0], $>>, unknown>
]

export type Morph<i = any, o = unknown> = (In: i, problems: Problems) => o

export type Out<o = unknown> = readonly ["|>", o]

export type ParsedMorph<i = any, o = unknown> = (In: i) => Out<o>

export type inferMorph<inDef, morph, $> = morph extends Morph
    ? (
          In: asIn<inferDefinition<inDef, $>>
      ) => Out<inferMorphOut<ReturnType<morph>>>
    : never

type inferMorphOut<out> = [out] extends [CheckResult<infer t>]
    ? t
    : Exclude<out, Problem>

export const writeMalformedMorphExpressionMessage = (value: unknown) =>
    `Morph expression requires a function following '|>' (was ${typeof value})`
