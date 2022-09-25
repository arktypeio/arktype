export { type, dynamic } from "./type.js"
export { space, define, dynamicSpace } from "./space.js"
export { declare } from "./declaration.js"
export { Root } from "./parser/root.js"
import type { Check } from "./nodes/traverse/exports.js"
export type CustomValidator = Check.CustomConstraint
export type { ReferencesOf } from "./nodes/traverse/references.js"
