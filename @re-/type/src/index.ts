export { type, dynamic, type ReferencesOf, type Infer } from "./type.js"
export { space, def, dynamicSpace } from "./space.js"
export { declare } from "./declaration.js"
export { Root } from "./root.js"
import type { Allows } from "./nodes/traversal/allows.js"
export type CustomValidator = Allows.CustomValidator
