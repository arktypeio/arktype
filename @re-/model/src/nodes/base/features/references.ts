export namespace References {
    export type Options = {}

    export type Config = Options

    export type Args = Config

    export const createArgs = (options: Options = {}): Args => {
        const args = {
            ...options
        }
        return args
    }
}
