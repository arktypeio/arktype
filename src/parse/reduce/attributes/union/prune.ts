import type { DynamicScope } from "../../../../scope.js"
import { isEmpty } from "../../../../utils/deepEquals.js"
import { pathToSegments } from "../../../../utils/paths.js"
import type {
    Attribute,
    AttributeBranches,
    AttributeKey,
    AttributePath,
    Attributes,
    DiscriminatedBranches,
    IntersectedBranches,
    UndiscriminatedBranches
} from "../attributes.js"
import { intersect } from "../intersect.js"
import { queryAttribute } from "../query.js"
import { subtract } from "../subtract.js"
import type { DiscriminatedKey } from "./discriminate.js"
import { union } from "./union.js"

export const pruneAttribute = <k extends AttributeKey>(a: Attributes, k: k) => {
    const value = a[k]
    delete a[k]
    return value
}

export const pruneBranches = (
    branches: AttributeBranches,
    given: Attributes,
    scope: DynamicScope
) =>
    branches[0] === "?"
        ? pruneDiscriminatedBranches(branches, given)
        : branches[0] === "|"
        ? pruneUndiscriminatedBranches(branches, given, scope)
        : pruneIntersectedBranches(branches, given, scope)

const pruneDiscriminatedBranches = (
    branches: DiscriminatedBranches,
    given: Attributes
): Attributes => {
    const discriminantPath = branches[1]
    const cases = branches[2]
    const discriminantValue = queryAttribute(given, discriminantPath)
    if (discriminantValue === undefined) {
        return { branches }
    }
    return (
        cases[discriminantValue] ?? {
            contradiction: `At ${discriminantPath}, ${discriminantValue} has no intersection with cases ${Object.keys(
                cases
            ).join(", ")}`
        }
    )
}

const pruneUndiscriminatedBranches = (
    branches: UndiscriminatedBranches,
    given: Attributes,
    scope: DynamicScope
): Attributes => {
    const viableBranches: Attributes[] = []
    for (const branch of branches[1]) {
        subtract(branch, given)
        if (isEmpty(branch)) {
            // If any of our branches is empty, assign is a subtype of
            // the branch and the branch will always be fulfilled. In
            // that scenario, we can safely remove all branches.
            return {}
        }
        if (!branch.contradiction) {
            viableBranches.push(branch)
        }
    }
    return union(viableBranches, scope)
}

const pruneIntersectedBranches = (
    branches: IntersectedBranches,
    given: Attributes,
    scope: DynamicScope
) => {
    const base: Attributes = {}
    for (const branch of branches[1]) {
        const branchAttributes =
            branch[0] === "?"
                ? pruneDiscriminatedBranches(branch, given)
                : pruneUndiscriminatedBranches(branch, given, scope)
        intersect(base, branchAttributes, scope)
    }
    return base
}

export const pruneDiscriminant = <k extends DiscriminatedKey>(
    attributes: Attributes,
    path: AttributePath<k>
) => {
    const segments = pathToSegments(path)
    const key = segments.pop() as k
    const traversal = traverseToDiscriminant(attributes, segments)
    if (!traversal.complete) {
        return
    }
    const top = traversal.traversed.pop()!
    const value = top[key]
    if (value === undefined) {
        return
    }
    delete top[key]
    pruneTraversedSegments(traversal.traversed, segments)
    return value
}

export const unpruneDiscriminant = <k extends DiscriminatedKey>(
    attributes: Attributes,
    path: AttributePath<k>,
    value: Attribute<k>
) => {
    const segments = pathToSegments(path)
    const key = segments.pop() as k
    let currentAttributes = attributes
    for (const segment of segments) {
        currentAttributes.props ??= {}
        currentAttributes.props[segment] ??= {}
        currentAttributes = currentAttributes.props[segment]
    }
    currentAttributes[key] = value
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

const pruneTraversedSegments = (
    traversed: Attributes[],
    segments: string[]
) => {
    for (let i = traversed.length - 1; i >= 0; i--) {
        const traversedProps = traversed[i].props!
        if (!isEmpty(traversedProps[segments[i]])) {
            return
        }
        delete traversedProps[segments[i]]
        if (!isEmpty(traversedProps)) {
            return
        }
        delete traversed[i].props
    }
}
