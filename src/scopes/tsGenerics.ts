import { node } from "../nodes/composite/type.js"
import { Scope } from "../scope.js"

export const tsGenerics = Scope.root({
    "Record<K, V>": {
        "[K]": "V"
    }
})

export const tsGenericTypes = tsGenerics.export()
