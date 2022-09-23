import { ElementOf, IterateType, Merge } from "@re-/tools"
import { RootNode } from "./common.js"

export type ReferencesOf<
    Def,
    Dict,
    Options extends References.TypeOptions = {}
> = Merge<
    { filter: string; preserveStructure: false; format: "list" },
    Options
> extends References.TypeOptions<
    infer Filter,
    infer PreserveStructure,
    infer Format
>
    ? References.TransformReferences<
          RootNode.References<Def, Dict, PreserveStructure>,
          Filter,
          Format
      >
    : {}

export namespace References {
    // The preserveStructure option is reflected by whether collectReferences() or structureRefrences() is called
    export type Args = Omit<Options, "preserveStructure">

    export type Collection = Record<string, true>

    export type Options<
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

    export type TypeFormat = "list" | "tuple" | "union"

    export type TypeOptions<
        Filter extends string = string,
        PreserveStructure extends boolean = boolean,
        Format extends TypeFormat = TypeFormat
    > = {
        filter?: Filter
        preserveStructure?: PreserveStructure
        format?: Format
    }

    export type ReferencesFunction<Def, Dict> = <
        Options extends References.Options = {}
    >(
        options?: Options
    ) => Merge<
        {
            filter: References.FilterFunction<string>
            preserveStructure: false
        },
        Options
    > extends References.Options<infer Filter, infer PreserveStructure>
        ? TransformReferences<
              RootNode.References<Def, Dict, PreserveStructure>,
              Filter,
              "list"
          >
        : []

    export type TransformReferences<
        References,
        Filter extends string,
        Format extends References.TypeFormat
    > = References extends string[]
        ? FormatReferenceList<
              FilterReferenceList<References, Filter, []>,
              Format
          >
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
        Format extends References.TypeFormat
    > = Format extends "tuple"
        ? References
        : Format extends "list"
        ? ElementOf<References>[]
        : ElementOf<References>

    export const createCollection = () => ({})
}
