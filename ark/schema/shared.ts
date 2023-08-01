import type { Dict } from "@arktype/util"
import type { DescriptionAttribute } from "./attributes/description.js"
import type { Disjoint } from "./disjoint.js"

export interface Intersectable {
	intersect(other: this): this | Disjoint
}

export type IntersectableRecord = Dict<string, Intersectable>
