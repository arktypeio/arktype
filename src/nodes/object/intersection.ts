import type { ScopeRoot } from "../../scope.js"
import { hasType } from "../../utils/typeOf.js"
import type { BaseObjectAttributes, ObjectAttributes } from "./attributes.js"

export const checkObject = (
    data: unknown,
    attributes: BaseObjectAttributes,
    scope: ScopeRoot
) => {
    if (!hasType(data, "object", attributes.subtype)) {
    }
    return true
}

export const objectIntersection = (
    l: BaseObjectAttributes,
    r: BaseObjectAttributes,
    scope: ScopeRoot
): ObjectAttributes | "never" => {
    if (r.type !== "object") {
        return "never"
    }
    return l as ObjectAttributes
}
