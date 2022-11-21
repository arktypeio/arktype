import type { ScopeRoot } from "../../../../scope.js"
import { isEmpty } from "../../../../utils/deepEquals.js"
import type { requireKeys } from "../../../../utils/generics.js"
import { pathToSegments } from "../../../../utils/paths.js"
import { throwInternalError } from "../../../errors.js"
import type { Attribute, AttributePath, Attributes } from "../attributes.js"
import { exclude, intersect } from "../operations.js"
import { compress } from "./compress.js"
import type { DiscriminatedKey } from "./discriminate.js"

export const pruneBranches = (
    base: Attributes,
    given: Attributes,
    scope: ScopeRoot
) => {
    if (!base.branches) {
        return base
    }
    if (base.branches[0] === "?") {
        return throwInternalError(unexpectedDiscriminatedBranchesMessage)
    }
    let result = base
    const unions =
        base.branches[0] === "|"
            ? [base.branches[1]]
            : base.branches[1].map((intersectedBranches) =>
                  intersectedBranches[0] === "?"
                      ? throwInternalError(
                            unexpectedDiscriminatedBranchesMessage
                        )
                      : intersectedBranches[1]
              )
    for (const union of unions) {
        const unionBase = pruneUnionToBase(union, given, scope)
        if (unionBase) {
            result = intersect(base, unionBase, scope)
        }
    }
    return result
}

const unexpectedDiscriminatedBranchesMessage =
    "Unexpected attempt to prune discriminated branches"

export const pruneUnionToBase = (
    union: Attributes[],
    given: Attributes,
    scope: ScopeRoot
) => {
    for (let i = 0; i < union.length; i++) {
        const remainingBranchAttributes = exclude(union[i], given)
        if (remainingBranchAttributes === null) {
            // If any of the branches is empty, assign is a subtype of
            // the branch and the branch will always be fulfilled. In
            // that scenario, we can safely remove all branches in that set.
            return
        }
        union[i] = remainingBranchAttributes
    }
    return compress(union, scope)
}

type AttributeTraversal = {
    traversed: Attributes[]
    complete: boolean
}

const traverseToDiscriminant = (
    root: Attributes,
    segments: string[]
): AttributeTraversal => {
    const traversed: Attributes[] = [root]
    let top: Attributes = root
    for (const segment of segments) {
        if (!top.props?.[segment]) {
            return { traversed, complete: false }
        }
        top = top.props[segment]
        traversed.push(top)
    }
    return {
        traversed,
        complete: true
    }
}

type AttributesWithProps = requireKeys<Attributes, "props">

const pruneTraversedSegments = (
    root: AttributesWithProps,
    traversed: AttributesWithProps[],
    segments: string[]
): Attributes => {
    const next = traversed.shift()
    if (!next) {
        return root
    }
    const propKey = segments.shift()!
    const nextPruned = pruneTraversedSegments(next, traversed, segments)
    if (!isEmpty(nextPruned.props[propKey])) {
        return root
    }
    const { [propKey]: _, ...neighboringProps } = nextPruned.props
    if (!isEmpty(neighboringProps)) {
        return { ...root, props: neighboringProps }
    }
    const { props, ...neighboringAttributes } = root
    return neighboringAttributes
}
