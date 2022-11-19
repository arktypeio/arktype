import { isEmpty } from "../../../../utils/deepEquals.js"
import { pathToSegments } from "../../../../utils/paths.js"
import type {
    Attribute,
    AttributePath,
    Attributes,
    DiscriminatedBranches
} from "../attributes.js"
import { assignIntersection } from "../intersection.js"
import { queryAttribute } from "../query.js"
import type { DiscriminatedKey } from "./discriminate.js"

export const pruneBranches = (base: Attributes, assign: Attributes) => {
    if (!base.branches) {
        return
    }
    if (base.branches[0] === "?") {
        pruneDiscriminatedBranches(
            base as AttributesWithDiscriminatedBranches,
            assign
        )
    } else {
        for (const branch of base.branches[1]) {
            assignIntersection(branch, assign)
        }
    }
}

type AttributesWithDiscriminatedBranches = Attributes & {
    branches: DiscriminatedBranches
}

const pruneDiscriminatedBranches = (
    base: AttributesWithDiscriminatedBranches,
    assign: Attributes
) => {
    const discriminantPath = base.branches[1]
    const cases = base.branches[2]
    const discriminantValue = queryAttribute(assign, discriminantPath)
    const caseKey =
        discriminantValue && discriminantValue in cases
            ? discriminantValue
            : "default"
    const caseAttributes = cases[caseKey]
    if (caseAttributes) {
        assignIntersection(base, caseAttributes)
        delete (base as Attributes)["branches"]
    } else {
        assignIntersection(base, {
            contradiction: `At ${discriminantPath}, ${discriminantValue} has no intersection with cases ${Object.keys(
                cases
            ).join(", ")}`
        })
    }
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
