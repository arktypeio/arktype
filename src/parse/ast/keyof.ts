import type { Branch } from "../../nodes/branch.ts"
import type { Predicate } from "../../nodes/predicate.ts"
import { resolutionExtendsDomain } from "../../nodes/predicate.ts"
import { mappedKeys } from "../../nodes/rules/props.ts"
import type { LiteralRules, Rules } from "../../nodes/rules/rules.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { keyOf } from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import { wellFormedNonNegativeIntegerMatcher } from "../../utils/numericLiterals.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import { writeImplicitNeverMessage } from "./intersection.ts"
import type { PrefixParser } from "./tuple.ts"

const numericIndexKey = {
    regex: wellFormedNonNegativeIntegerMatcher.source
} satisfies Rules<"string">

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) => {
    const resolution = ctx.type.meta.scope.resolveNode(
        parseDefinition(def[1], ctx)
    )

    if (!resolutionExtendsDomain(resolution, "object")) {
        return throwParseError(writeImplicitNeverMessage(ctx.path, "keyof"))
    }
    if (resolution.object === true) {
        return writeImplicitNeverMessage(ctx.path, "keyof")
    }

    const objectBranches = listFrom(resolution.object)
    let sharedKeys = keysOfBranch(objectBranches[0])

    for (let i = 1; i < objectBranches.length; i++) {
        const branchKeys = keysOfBranch(objectBranches[i])
        // we can filter directly by equality here because the RegExp we're
        // using will always be reference equal to
        // wellFormedNonNegativeIntegerMatcher
        sharedKeys = sharedKeys.filter((k) => branchKeys.includes(k))
    }

    const result: KeyBranch[] = sharedKeys.map((k) =>
        typeof k === "string" ? { value: k } : { regex: k.source }
    )

    return result.length
        ? {
              string: (result.length === 1
                  ? result[0]
                  : result) as Predicate<"string">
          }
        : writeImplicitNeverMessage(ctx.path, "keyof")
}

type KeyBranch = LiteralRules<"string"> | typeof numericIndexKey

type KeyValue = string | RegExp

const keysOfBranch = (branch: Branch): KeyValue[] => {
    if (!("props" in branch)) {
        return []
    }
    if (branch.class !== "Array") {
        return Object.keys(branch.props)
    }
    const arrayProps: KeyValue[] = []
    for (const key of Object.keys(branch.props)) {
        if (key === "length") {
            continue
        }
        if (key === mappedKeys.index) {
            arrayProps.push(wellFormedNonNegativeIntegerMatcher)
        } else {
            arrayProps.push(key)
        }
    }
    return arrayProps
}

export type inferKeyOfExpression<operandDef, $> = keyOf<
    inferDefinition<operandDef, $>
>

export type validateKeyOfExpression<operandDef, $> = [
    "keyof",
    inferKeyOfExpression<operandDef, $> extends never
        ? writeImplicitNeverMessage<[], "keyof">
        : validateDefinition<operandDef, $>
]
