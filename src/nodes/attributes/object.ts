import type { ScopeRoot } from "../../scope.js"
import type { keySet, subtype } from "../../utils/generics.js"
import type { dict, ObjectSubtypeName } from "../../utils/typeOf.js"
import type { Node } from "../node.js"
import type { Bounds } from "./bounds.js"

export type ObjectAttributes<scope extends dict = dict> =
    UniversalObjectAttributes<scope> &
        (ArrayAttributes<scope> | FunctionAttributes<scope> | {})

export type BaseObjectAttributes<scope extends dict = dict> =
    UniversalObjectAttributes<scope> & BaseSubtypeAttributes<scope>

type UniversalObjectAttributes<scope extends dict> = {
    readonly type: "object"
    readonly props?: dict<Node<scope>>
    readonly requiredKeys?: keySet
}

type BaseSubtypeAttributes<scope extends dict> = {
    readonly subtype?: ObjectSubtypeName
    readonly elements?: ElementsAttribute<scope>
    readonly bounds?: Bounds
}

type ArrayAttributes<scope extends dict> = subtype<
    BaseSubtypeAttributes<scope>,
    {
        readonly subtype: "array"
        readonly elements?: ElementsAttribute<scope>
        readonly bounds?: Bounds
    }
>

type ElementsAttribute<scope extends dict> =
    | Node<scope>
    | readonly Node<scope>[]

export type FunctionAttributes<scope extends dict> = subtype<
    BaseSubtypeAttributes<scope>,
    {
        readonly subtype: "function"
    }
>

export const checkObject = (
    data: object,
    attributes: BaseObjectAttributes,
    scope: ScopeRoot
) => {
    return true
}

export const objectIntersection = (
    l: BaseObjectAttributes,
    r: BaseObjectAttributes,
    scope: ScopeRoot
) => {
    return l as Node
}
