import type { dictionary } from "../utils/dynamicTypes.js"
import { satisfies } from "../utils/generics.js"
import type { Type } from "./attributes.js"

export const morph = (name: MorphName, input: Type) => morphs[name](input)

export type MorphName = keyof typeof morphs

const morphs = satisfies<dictionary<(input: Type) => Type>>()({
    array: (input) => ({
        array: {
            props: {
                "*": input
            }
        }
    })
})
