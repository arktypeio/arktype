import { isEmpty } from "../../../../utils/deepEquals.js"
import { pathToSegments } from "../../../../utils/paths.js"
import type {
    Attribute,
    AttributePath,
    Attributes,
    BranchedAttributes,
    DiscriminatedBranches,
    IntersectedBranches,
    UndiscriminatedBranches,
    UnionBranches
} from "../attributes.js"
import { assignIntersection } from "../intersection.js"
import { queryAttribute } from "../query.js"
import type { DiscriminatedKey } from "./discriminate.js"
import { union } from "./union.js"

export const pruneBranches = (base: BranchedAttributes, assign: Attributes) => {
    let prunableRoot
    if (base.branches[0] === "?") {
        prunableRoot = pruneDiscriminatedBranches(base, base.branches, assign)
    } else if (base.branches[0] === "|") {
        prunableRoot = pruneUndiscriminatedBranches(base, base.branches, assign)
    } else {
        prunableRoot = pruneIntersectedBranches(base, base.branches, assign)
    }
    if (prunableRoot) {
        delete (base as Attributes).branches
    }
}

const pruneDiscriminatedBranches = (
    base: Attributes,
    branches: DiscriminatedBranches,
    assign: Attributes
): boolean => {
    const discriminantPath = branches[1]
    const cases = branches[2]
    const discriminantValue = queryAttribute(assign, discriminantPath)
    if (discriminantValue === undefined) {
        return false
    }
    const caseAttributes = cases[discriminantValue]
    if (caseAttributes) {
        assignIntersection(base, caseAttributes)
        return true
    }
    assignIntersection(base, {
        contradiction: `At ${discriminantPath}, ${discriminantValue} has no intersection with cases ${Object.keys(
            cases
        ).join(", ")}`
    })
    return false
}

const pruneUndiscriminatedBranches = (
    base: Attributes,
    branches: UndiscriminatedBranches,
    assign: Attributes
): boolean => {
    const viableBranches: Attributes[] = []
    for (const branch of branches[1]) {
        assignIntersection(branch, assign)
        if (isEmpty(branch)) {
            // If any of our branches is empty, assign is a subtype of
            // the branch and the branch will always be fulfilled. In
            // that scenario, we can safely remove all branches.
            return true
        }
        if (!branch.contradiction) {
            viableBranches.push(branch)
        }
    }
    assignIntersection(base, union(viableBranches))
    return false
}

const pruneIntersectedBranches = (
    base: Attributes,
    branches: IntersectedBranches,
    assign: Attributes
): boolean => {
    const remainingBranches: UnionBranches[] = []
    for (const branch of branches[1]) {
        const intersectedBranchIsPrunable =
            branch[0] === "?"
                ? pruneDiscriminatedBranches(base, branch, assign)
                : pruneUndiscriminatedBranches(base, branch, assign)
        if (!intersectedBranchIsPrunable) {
            remainingBranches.push(branch)
        }
    }
    return remainingBranches.length === 0
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
