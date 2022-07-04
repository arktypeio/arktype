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

    export type Config = Options

    export type Args = Config

    export const createArgs = (options: Options = {}): Args => {
        const args = {
            ...options
        }
        return args
    }
}
