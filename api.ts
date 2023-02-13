export { scope } from "./src/scopes/scope.ts"
export { type } from "./src/scopes/standard.ts"
export {
    intersection,
    union,
    arrayOf,
    instanceOf,
    fromNode,
    literal,
    morph,
    narrow,
    keyOf
} from "./src/scopes/expressions.ts"
export type { Type } from "./src/scopes/type.ts"
export { Problems, Problem } from "./src/traverse/problems.ts"
