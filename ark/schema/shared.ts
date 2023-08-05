import type { Dict } from "@arktype/util"
import type { Disjoint } from "./disjoint.js"
import type { ProblemCode } from "./io/problems.js"

export interface Intersectable {
	intersect(other: this): this | Disjoint
}

export type IntersectableRecord = Dict<string, Intersectable>

export type KeyCheckKind = "loose" | "strict" | "distilled"

export type TypeConfig = {
	keys?: KeyCheckKind
	mustBe?: string
}

export type ScopeConfig = {
	ambient?: Scope | null
	codes?: Record<ProblemCode, { mustBe?: string }>
	keys?: KeyCheckKind
}
