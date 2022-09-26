import type { ElementOf, IterateType, Merge } from "@re-/tools"
import type { RootNode } from "../common.js"

export type ReferencesOf<
    Def,
    Dict,
    Options extends ReferenceTypeOptions = {}
> = Merge<
    { filter: string; preserveStructure: false; format: "array" },
    Options
> extends ReferenceTypeOptions<
    infer Filter,
    infer PreserveStructure,
    infer Format
>
    ? TransformReferences<
          [],
          //RootNode.References<Def, Dict, PreserveStructure>,
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
    filter?: FilterFn<Filter>
    preserveStructure?: PreserveStructure
}

export type StructuredReferences = {
    [K in string | number]: string[] | StructuredReferences
}

export type FilterFn<Filter extends string> =
    | ((reference: string) => reference is Filter)
    | ((reference: string) => boolean)

export type ReferenceTypeFormat = "array" | "tuple" | "union"

export type ReferenceTypeOptions<
    Filter extends string = string,
    PreserveStructure extends boolean = boolean,
    Format extends ReferenceTypeFormat = ReferenceTypeFormat
> = {
    filter?: Filter
    preserveStructure?: PreserveStructure
    format?: Format
}

export type ReferencesFn<Def, Dict> = <Options extends ReferencesOptions = {}>(
    options?: Options
) => Merge<
    {
        filter: FilterFn<string>
        preserveStructure: false
    },
    Options
> extends ReferencesOptions<infer Filter, infer PreserveStructure>
    ? TransformReferences<
          RootNode.References<Def, Dict, PreserveStructure>,
          Filter,
          "array"
      >
    : []

export type TransformReferences<
    References,
    Filter extends string,
    Format extends ReferenceTypeFormat
> = References extends string[]
    ? FormatReferences<FilterReferences<References, Filter, []>, Format>
    : {
          [K in keyof References]: TransformReferences<
              References[K],
              Filter,
              Format
          >
      }

type FilterReferences<
    References extends string[],
    Filter extends string,
    Result extends string[]
> = References extends IterateType<string, infer Current, infer Remaining>
    ? FilterReferences<
          Remaining,
          Filter,
          Current extends Filter ? [...Result, Current] : Result
      >
    : Result

type FormatReferences<
    References extends string[],
    Format extends ReferenceTypeFormat
> = Format extends "tuple"
    ? References
    : Format extends "array"
    ? ElementOf<References>[]
    : ElementOf<References>

export const createCollection = () => ({})
