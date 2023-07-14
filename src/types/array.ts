import { ObjectPredicate } from "./object.js"
import type { Type } from "./type.js"

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1
// Figure out best design for integrating with named props.
export class ArrayPredicate extends ObjectPredicate {
    readonly prefixed?: readonly Type[]
    readonly variadic?: Type
    readonly postfixed?: readonly Type[]
}
