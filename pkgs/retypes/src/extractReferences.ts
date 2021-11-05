import {
    Narrow,
    Evaluate,
    ListPossibleTypes,
    NonRecursible,
    DeepEvaluate
} from "@re-do/utils"
import { TypeDefinition } from "./definitions.js"

type DeepListPossibleTypes<T> = {
    [K in keyof T]: T[K] extends NonRecursible
        ? ListPossibleTypes<T[K]>
        : DeepListPossibleTypes<T[K]>
}

type ExtractedReferences<Definition, ActiveTypeSet> = DeepEvaluate<
    DeepListPossibleTypes<
        TypeDefinition<
            Definition,
            keyof ActiveTypeSet & string,
            { extractTypesReferenced: true }
        >
    >
>

const extractReferences = <Definition, ActiveTypeSet>(
    definition: TypeDefinition<
        Narrow<Definition>,
        keyof ActiveTypeSet & string
    >,
    typeSet: Narrow<ActiveTypeSet>
): ExtractedReferences<Definition, ActiveTypeSet> => {
    return {} as any
}

const f = extractReferences(
    { a: { b: { c: "(a)=>c", d: ["b", "a", "string"] }, e: "c|a" } },
    { a: 0, b: 0, c: 0 }
)
