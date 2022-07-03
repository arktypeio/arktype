export namespace References {
    export type Options<
        Filter = unknown,
        PreserveStructure extends boolean = boolean
    > = {
        filter?: (value: unknown) => value is Filter
        preserveStructure?: PreserveStructure
    }

    export type TypeFormat = "list" | "tuple" | "union"

    export type Config = Options

    export type Args = Config

    export const createArgs = (options: Options = {}): Args => {
        const args = {
            ...options
        }
        return args
    }
}
