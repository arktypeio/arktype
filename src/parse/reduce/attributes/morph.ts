import type { dictionary } from "../../../utils/dynamicTypes.js"
import { satisfies } from "../../../utils/generics.js"
import type { Attributes } from "./attributes.js"

export const morph = (name: MorphName, input: Attributes) => morphs[name](input)

export type MorphName = keyof typeof morphs

const morphs = satisfies<dictionary<(input: Attributes) => Attributes>>()({
    array: (input) => ({
        type: "array",
        props: {
            "*": input
        }
    })
})
