export { scope } from "./scopes/scope.js"
export { type, ark, arkScope } from "./scopes/ark.js"
export type { Infer } from "./parse/definition.js"
export type { Scope, Space } from "./scopes/scope.js"
export {
    arrayOf,
    instanceOf,
    intersection,
    keyOf,
    morph,
    narrow,
    union,
    valueOf
} from "./scopes/expressions.js"
export { jsObjectsScope } from "./scopes/jsObjects.js"
export { tsKeywordsScope } from "./scopes/tsKeywords.js"
export { validationScope } from "./scopes/validation/validation.js"
export type { Type } from "./scopes/type.js"
export { Problems, Problem } from "./traverse/problems.js"
export { parseConfigTuple } from "./parse/ast/config.js"
export type { validateBound } from "./parse/ast/bound.js"
export type { validateDivisor } from "./parse/ast/divisor.js"
export type { ResolvedNode } from "./nodes/node.js"
