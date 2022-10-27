import type { dictionary, Mutable } from "../internal.js"
import { throwInternalError } from "../internal.js"
import type { Attributes } from "./attributes.js"
import type { KeyReducer } from "./shared.js"

// export const reduceProp: Reducer<
//     "children"
// > = (base, key, attributes) => {
//     // TODO: Should add type here?
//     // TODO: Should universal props be intersected with non-universal?
//     if (key === true) {
//         return base.values
//             ? {
//                   ...base,
//                   values: reduceIntersection(base.values, attributes)
//               }
//             : attributes
//     }
//     // Even though externally props are readonly, internally we
//     // mutate them to avoid creating many unnecessary objects.
//     const mutableProps: Mutable<dictionary<Attributes>> = base.children ?? {}
//     if (key in mutableProps) {
//         return throwInternalError(
//             `Unexpectedly tried to overwrite prop '${key}'.`
//         )
//     }
//     mutableProps[key] = attributes
//     return base
// }
