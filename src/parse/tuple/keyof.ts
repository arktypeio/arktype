import type { Branch } from "../../nodes/predicate.ts"
import { resolutionExtendsDomain } from "../../nodes/predicate.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { nonArrayKeyOf } from "../../utils/generics.ts"
import { hasKey, listFrom } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import { writeImplicitNeverMessage } from "../string/ast.ts"
import type { PrefixParser } from "./tuple.ts"

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

    const branchKeys: string[][] = []

    const objectBranches = listFrom(resolution.object)
    const initialKeys = getPropsFromBranch(objectBranches[0])

    for (let i = 1; i < objectBranches.length; i++) {
        const keys = getPropsFromBranch(objectBranches[i])
        if (!keys.length) {
            return writeImplicitNeverMessage(ctx.path, "keyof")
        }
        branchKeys.push(keys)
    }

    const result: Branch[] = []

    initialKeys.forEach((key) => {
        const hasKey = branchKeys.every((keySet) => keySet.includes(key))
        if (hasKey) {
            result.push({ value: key })
        }
    })

    return result.length
        ? {
              string: result
          }
        : writeImplicitNeverMessage(ctx.path, "keyof")
}

const getPropsFromBranch = (branch: Branch) =>
    hasKey(branch, "props") ? Object.keys(branch.props) : []

export type inferKeyOfExpression<operandDef, $> = nonArrayKeyOf<
    inferDefinition<operandDef, $>
>

export type validateKeyOfExpression<operandDef, $> = [
    "keyof",
    inferKeyOfExpression<operandDef, $> extends never
        ? writeImplicitNeverMessage<[], "keyof">
        : validateDefinition<operandDef, $>
]
