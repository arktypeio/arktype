import {
    Narrow,
    ListPossibleTypes,
    NonRecursible,
    DeepEvaluate
} from "@re-do/utils"
import { Validate } from "./definition.js"

type DeepListPossibleTypes<T> = {
    [K in keyof T]: T[K] extends NonRecursible
        ? ListPossibleTypes<T[K]>
        : DeepListPossibleTypes<T[K]>
}

type ExtractedReferences<Definition, ActiveTypeSet> = DeepEvaluate<
    DeepListPossibleTypes<
        Validate<
            Definition,
            keyof ActiveTypeSet & string,
            { extractTypesReferenced: true }
        >
    >
>

const extractReferences = <Definition, ActiveTypeSet>(
    definition: Validate<Narrow<Definition>, keyof ActiveTypeSet & string>,
    typeSet: Narrow<ActiveTypeSet>
): ExtractedReferences<Definition, ActiveTypeSet> => {
    return {} as any
}
