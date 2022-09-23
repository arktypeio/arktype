import type { ElementOf, IterateType, Merge } from "@re-/tools"
import type { RootNode } from "../common.js"

export type ReferencesOf<
    Def,
    Dict,
    Options extends ReferenceTypeOptions = {}
> = Merge<
    { filter: string; preserveStructure: false; format: "list" },
    Options
> extends ReferenceTypeOptions<
    infer Filter,
    infer PreserveStructure,
    infer Format
>
    ? TransformReferences<
          RootNode.References<Def, Dict, PreserveStructure>,
          Filter,
          Format
      >
    : {}

// The preserveStructure option is reflected by whether collectReferences() or structureRefrences() is called
export type ReferencesArgs = Omit<ReferencesOptions, "preserveStructure">

export type ReferenceCollection = Record<string, true>

export type ReferencesOptions<
    Filter extends string = string,
    PreserveStructure extends boolean = boolean
> = {
    filter?: FilterFunction<Filter>
    preserveStructure?: PreserveStructure
}

export type StructuredReferences = {
    [K in string | number]: string[] | StructuredReferences
}

export type FilterFunction<Filter extends string> =
    | ((reference: string) => reference is Filter)
    | ((reference: string) => boolean)

export type ReferenceTypeFormat = "list" | "tuple" | "union"

export type ReferenceTypeOptions<
    Filter extends string = string,
    PreserveStructure extends boolean = boolean,
    Format extends ReferenceTypeFormat = ReferenceTypeFormat
> = {
    filter?: Filter
    preserveStructure?: PreserveStructure
    format?: Format
}

export type ReferencesFunction<Def, Dict> = <
    Options extends ReferencesOptions = {}
>(
    options?: Options
) => Merge<
    {
        filter: FilterFunction<string>
        preserveStructure: false
    },
    Options
> extends ReferencesOptions<infer Filter, infer PreserveStructure>
    ? TransformReferences<
          RootNode.References<Def, Dict, PreserveStructure>,
          Filter,
          "list"
      >
    : []

export type TransformReferences<
    References,
    Filter extends string,
    Format extends ReferenceTypeFormat
> = References extends string[]
    ? FormatReferenceList<FilterReferenceList<References, Filter, []>, Format>
    : {
          [K in keyof References]: TransformReferences<
              References[K],
              Filter,
              Format
          >
      }

type FilterReferenceList<
    References extends string[],
    Filter extends string,
    Result extends string[]
> = References extends IterateType<string, infer Current, infer Remaining>
    ? FilterReferenceList<
          Remaining,
          Filter,
          Current extends Filter ? [...Result, Current] : Result
      >
    : Result

type FormatReferenceList<
    References extends string[],
    Format extends ReferenceTypeFormat
> = Format extends "tuple"
    ? References
    : Format extends "list"
    ? ElementOf<References>[]
    : ElementOf<References>

export const createCollection = () => ({})
