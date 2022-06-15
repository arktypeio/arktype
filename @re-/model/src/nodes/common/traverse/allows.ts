import { Parse } from "../parse.js"
import { ErrorsByPath, stringifyDef, stringifyValue } from "../utils.js"
import { Traverse } from "./traverse.js"

export namespace Allows {
    export type Options = {
        ignoreExtraneousKeys?: boolean
        validator?: CustomValidator
        verbose?: boolean
    }

    export type CustomValidator = (
        args: CustomValidatorArgs
    ) => undefined | string | ErrorsByPath

    export type CustomValidatorArgs = {
        def: unknown
        value: unknown
        getOriginalErrors: () => ErrorsByPath
        path: string
    }

    export type Context = Traverse.Context & {
        errors: AssignabilityErrors
    }

    export type Config = Options

    export type Args = {
        value: unknown
        errors: AssignabilityErrors
        cfg: Config
        ctx: Traverse.Context
    }

    export class ValidationError extends Error {}

    export const buildUnassignableErrorMessage = (
        def: unknown,
        value: unknown
    ) => `${stringifyValue(value)} is not assignable to ${stringifyDef(def)}.`

    export const getErrorsFromCustomValidator = (
        validator: CustomValidator,
        args: CustomValidatorArgs
    ): ErrorsByPath => {
        const customErrors = validator(args)
        if (!customErrors) {
            return {}
        }
        if (typeof customErrors === "string") {
            return { [args.path]: customErrors }
        }
        return customErrors
    }

    export class AssignabilityErrors extends ErrorsByPath {
        addUnassignable(def: unknown, args: Allows.Args) {
            this.set(
                args.ctx.path,
                `${stringifyValue(
                    args.value
                )} is not assignable to ${stringifyDef(def)}.`
            )
        }
    }

    export class Traversal extends Traverse.Traversal<Context, Config> {
        constructor(options?: Options) {
            super(Traverse.createContext(), options ?? {})
        }
    }
}
