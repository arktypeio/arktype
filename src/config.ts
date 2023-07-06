import type { ProblemCode } from "./compiler/problems.js"
import type { Scope } from "./scope.js"

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
