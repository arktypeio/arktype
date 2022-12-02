import type { keySet } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { Node } from "../node.js"
import type { Bounds } from "./bounds.js"

export type ObjectAttributes<scope extends dict = dict> =
    BaseObjectAttributes<scope>

export type BaseObjectAttributes<scope extends dict> = {
    readonly type: "object"
    readonly props?: dict<Node<scope>>
    readonly requiredKeys?: keySet
} & (UnspecifiedSubtypeAttributes | ArrayAttributes<scope> | FunctionAttributes)

export type UnspecifiedSubtypeAttributes = {}

export type ArrayAttributes<scope extends dict> = {
    readonly subtype: "array"
    readonly elements?: Node<scope> | readonly Node<scope>[]
    readonly bounds?: Bounds
}

export type FunctionAttributes = {
    readonly subtype: "function"
}
