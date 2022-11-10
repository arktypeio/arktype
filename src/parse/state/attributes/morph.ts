import type { subtype } from "../../../utils/generics.js"
import { Scanner } from "../scanner.js"
import type { Attributes } from "./attributes.js"

const array = (elementAttributes: Attributes): Attributes => ({
    type: "array",
    props: {
        "*": elementAttributes
    }
})

export type MorphName = keyof typeof morphisms

export type morphisms = subtype<
    Record<MorphName, string>,
    {
        array: "[]"
    }
>

export const morphisms = {
    array
}
