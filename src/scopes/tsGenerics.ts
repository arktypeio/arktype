import { Scope } from "../scope.js"
import type { Generic } from "../type.js"
import type { RootScope } from "./utils.js"

export type InferredTsGenerics = {
    Record: Generic<
        ["K", "V"],
        {
            "[K]": "V"
        },
        // as long as the generics in the root scope don't reference one
        // another, they shouldn't need a bound local scope
        {}
    >
}

export const tsGenerics: RootScope<InferredTsGenerics> = Scope.root({
    "Record<K, V>": {
        "[K]": "V"
    }
    // unfortunately TS won't let us assign this directly, so we need to be
    // careful to keep the inferred types in sync
}) satisfies RootScope<{ [k in keyof InferredTsGenerics]: any }> as never

export const tsGenericTypes = tsGenerics.export()
