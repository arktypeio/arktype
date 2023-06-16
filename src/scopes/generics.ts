import { node } from "../nodes/composite/type.js"
import { Scope } from "../scope.js"

export const tsGenerics = Scope.root({
    "Record<K, V>": node({ basis: "object" })
})

export const tsGenericTypes = tsGenerics.export()
