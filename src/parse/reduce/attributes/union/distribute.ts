import type { AttributeBranches, Attributes } from "../attributes.js"
import {
    assignAttributeIntersection,
    assignIntersection
} from "../intersection.js"
import { queryAttribute } from "../query.js"

export const distribute = (a: Attributes, branches: AttributeBranches) => {
    if (branches[0] === "?") {
        const discriminantValue = queryAttribute(a, branches[1])
        const caseKey =
            discriminantValue && discriminantValue in branches[2]
                ? discriminantValue
                : "default"
        const caseAttributes = branches[2][caseKey]
        if (caseAttributes) {
            assignIntersection(a, caseAttributes)
            delete a["branches"]
        } else {
            assignAttributeIntersection(
                a,
                "contradiction",
                `At ${
                    branches[1]
                }, ${discriminantValue} has no intersection with cases ${Object.keys(
                    branches[2]
                ).join(", ")}`
            )
        }
    }
}
