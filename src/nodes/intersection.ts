import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { defined, stringKeyOf } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import { bigintIntersection } from "./attributes/bigint.js"
import { booleanIntersection } from "./attributes/boolean.js"
import type { LiteralChecker } from "./attributes/literals.js"
import { literalableIntersection } from "./attributes/literals.js"
import { numberIntersection } from "./attributes/number.js"
import { objectIntersection } from "./attributes/object.js"
import { stringIntersection } from "./attributes/regex.js"
import type { Node } from "./node.js"

export const intersection = (lNode: Node, rNode: Node, scope: ScopeRoot) => {
    let k: TypeName
    for (k in rNode) {
        const l = rNode[k]
        const r = lNode[k]
        if (l === undefined || r === undefined) {
            continue
        }
        if (l === true) {
            result[k] = r as any
            continue
        }
        if (r === true) {
            result[k] = l as any
            continue
        }
        const viableBranches = branchesIntersection(
            k as ExtendableTypeName,
            listFrom(l),
            listFrom(r),
            scope
        )
        if (viableBranches.length) {
            result[k] =
                viableBranches.length === 1
                    ? viableBranches[0]
                    : (viableBranches as any)
        }
    }
    // If the operation included a name and its result is identical to the
    // original resolution of that name, return the name instead of its expanded
    // form as the result
    if (typeof l === "string" && deepEquals(result, lResolution)) {
        return l
    }
    if (typeof r === "string" && deepEquals(result, rResolution)) {
        return r
    }
}

export type AttributesIntersection<attributes extends dict> = (
    l: attributes,
    r: attributes,
    scope: ScopeRoot
) => attributes | "never"

const reducers: {
    [typeName in ExtendableTypeName]: AttributesIntersection<
        AttributesByType[typeName]
    >
} = {
    bigint: bigintIntersection,
    boolean: booleanIntersection,
    number: numberIntersection,
    object: objectIntersection,
    string: stringIntersection
}

// TODO: Types uppercase when generic in function, lowercase when generic in type?
const branchesIntersection = <TypeName extends ExtendableTypeName>(
    typeName: TypeName,
    lBranches: BranchesOfType<TypeName>,
    rBranches: BranchesOfType<TypeName>,
    scope: ScopeRoot
) => {
    const result: ResolvedBranchesOfType<TypeName> = []
    for (const l of resolveBranches(typeName, lBranches, scope)) {
        for (const r of resolveBranches(typeName, rBranches, scope)) {
            const branchResult = reducers[typeName](l as any, r as any, scope)
            if (branchResult !== "never") {
                result.push(branchResult)
            }
        }
    }
    return result
}

export type IntersectionContext<attributes> = {
    leftRoot: attributes
    rightRoot: attributes
    scope: ScopeRoot
}

type ContextualIntersection<t, context> = (
    l: t,
    r: t,
    context: context
) => t | "never"

export type KeyReducer<
    attributes extends dict,
    k extends stringKeyOf<attributes>
> = ContextualIntersection<
    defined<attributes[k]>,
    IntersectionContext<attributes>
>

export type AttributesReducer<attributes extends dict> = {
    [k in Exclude<stringKeyOf<attributes>, "type">]-?: k extends "literal"
        ? LiteralChecker<attributes>
        : KeyReducer<attributes, k>
}

export const composeIntersection =
    <attributes extends dict>(
        reducers: AttributesReducer<attributes>
    ): AttributesIntersection<attributes> =>
    (l, r, scope): Node => {
        if (reducers.literal) {
            const result = literalableIntersection(
                l,
                r,
                reducers.literal as any
            )
            if (result) {
                return result
            }
        }
        const result = { ...l, ...r }
        const context: IntersectionContext<attributes> = {
            leftRoot: l,
            rightRoot: r,
            scope
        }
        for (const k in result) {
            if (l[k] && r[k]) {
                const keyResult = reducers[k](l[k] as any, r[k] as any, context)
                if (keyResult === "never") {
                    return "never"
                }
                result[k] = keyResult as any
            }
        }
        return result
    }
