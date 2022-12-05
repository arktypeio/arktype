import type { ScopeRoot } from "../../scope.js"
import type { defined } from "../../utils/generics.js"
import { hasType } from "../../utils/typeOf.js"
import { boundsIntersection } from "../shared/bounds.js"
import type {
    BaseObjectAttributes,
    ObjectAttributeName,
    ObjectAttributes
} from "./attributes.js"

export type ObjectKeyIntersection<t> = (l: t, r: t) => t | null

type IntersectedObjectKey = Exclude<ObjectAttributeName, "type" | "subtype">

type ObjectKeyIntersections = {
    [k in IntersectedObjectKey]: ObjectKeyIntersection<
        defined<BaseObjectAttributes[k]>
    >
}

const objectKeyIntersections: ObjectKeyIntersections = {
    bounds: boundsIntersection
}

export const checkObject = (
    data: unknown,
    attributes: BaseObjectAttributes,
    scope: ScopeRoot
) => {
    if (!hasType(data, "object", attributes.subtype)) {
        return false
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
