import type { Attributes } from "./attributes.js"

const array = (elementAttributes: Attributes): Attributes => ({
    type: "array",
    props: {
        "*": elementAttributes
    }
})

export type MorphName = keyof typeof morphisms

export const morphisms = {
    array
}
