import type {
    AttributeBranches,
    Attributes
} from "../../reduce/attributes/attributes.js"
import {
    applyOperation,
    applyOperationAtKey
} from "../attributes/operations.js"
import { traverseToDiscriminant } from "./prune.js"

export const distribute = (a: Attributes, branches: AttributeBranches) => {
    if (branches.kind === "switch") {
        const discriminantValue = traverseToDiscriminant(
            a,
            branches.path,
            branches.key
        ).value
        const caseKey =
            discriminantValue && discriminantValue in branches.cases
                ? discriminantValue
                : "default"
        const caseAttributes = branches.cases[caseKey]
        if (caseAttributes) {
            applyOperation("&", a, caseAttributes)
            delete a["branches"]
        } else {
            applyOperationAtKey(
                "&",
                a,
                "contradiction",
                `${branches.path ? `At ${branches.path}, ` : ""}${
                    branches.key
                } ${discriminantValue} has no intersection with cases ${Object.keys(
                    branches.cases
                ).join(", ")}`
            )
        }
    } else if (branches.kind === "some") {
        // for (const branch of branches.of) {
        //     applyOperation("-", branch, a)
        // }
    }
}
