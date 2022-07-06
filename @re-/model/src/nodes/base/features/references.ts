export namespace References {
    export type Options<
        Filter extends string = string,
        PreserveStructure extends boolean = boolean
    > = {
        filter?: FilterFunction<Filter>
        preserveStructure?: PreserveStructure
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

    // The preserveStructure option is reflected by whether collectReferences() or structureRefrences() is called
    export type Args = Omit<Options, "preserveStructure">

    export type Collection = Set<string>
}
