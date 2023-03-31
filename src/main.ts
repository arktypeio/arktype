export { scope } from "./scopes/scope.ts"
export { type, ark, arkScope } from "./scopes/ark.ts"
export type { Infer } from "./parse/definition.ts"
export type { Scope, Space } from "./scopes/scope.ts"
export {
    arrayOf,
    instanceOf,
    intersection,
    keyOf,
    morph,
    narrow,
    union,
    valueOf
} from "./scopes/expressions.ts"
export { jsObjectsScope } from "./scopes/jsObjects.ts"
export { tsKeywordsScope } from "./scopes/tsKeywords.ts"
export { validationScope } from "./scopes/validation/validation.ts"
export type { Type } from "./scopes/type.ts"
export { Problems, Problem } from "./nodes/problems.ts"
export { parseConfigTuple } from "./parse/ast/config.ts"
export type { validateBound } from "./parse/ast/bound.ts"
export type { validateDivisor } from "./parse/ast/divisor.ts"
