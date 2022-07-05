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

    // Whether to preserveStructure is determined by whether
    // Node.references() or Node.structuredRefrences() is being called.
    export type Args = Omit<Options, "preserveStructure">

    export const createArgs = (options: Options = {}): Args => {
        return options
    }
}
