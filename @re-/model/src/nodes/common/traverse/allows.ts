import { Parser } from "../parse.js"
import { stringifyDef, stringifyValue } from "../utils.js"
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

    export type Context = Traverse.Context

    export type Config = Options

    export type Args = {
        value: unknown
        errors: ErrorsByPath
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

    export class PathMap<T> extends Map<string, T> {}

    export type ErrorTree = Record<
        string,
        { message?: string; branches?: Record<string, ErrorsByPath> }
    >

    export class ErrorsByBranch {
        private branches: Record<string, ErrorsByPath>

        branch(name: string) {
            {
                branchRoot.branches[name] = errorBranch
            }
            return errorBranch
        }
    }

    export class ErrorsByPath {
        private errors: ErrorTree = {}

        get count() {
            return Object.keys(this.errors).length
        }

        message(path: string, message: string) {
            if (!this.errors[path]) {
                this.errors[path] = { message }
            } else {
                this.errors[path].message = message
            }
        }

        branch(path: string, name: string) {
            const branchRoot = this.errors[path]
            const errorBranch = new ErrorsByPath()
            if (!branchRoot) {
                this.errors[path] = { branches: { [name]: errorBranch } }
            } else if (!branchRoot.branches) {
                branchRoot.branches = { [name]: errorBranch }
            } else {
                branchRoot.branches[name] = errorBranch
            }
            return errorBranch
        }

        prune(path: string) {
            delete this.errors[path]
        }

        toString() {
            let formattedMessage = ""
            const entries = Object.entries(this.errors)
            if (entries.length === 1) {
                const [path, message] = entries[0]
                if (path) {
                    formattedMessage += `At path ${path}, `
                }
                formattedMessage += message
            } else if (entries.length > 1) {
                formattedMessage +=
                    "Encountered errors at the following paths:\n"
                for (const [path, message] of entries) {
                    formattedMessage += `  ${path}: ${message}\n`
                }
            }
            return formattedMessage
        }
    }

    export class Traversal extends Traverse.Traversal<Config> {
        private errors: ErrorsByPath
        constructor(options?: Options) {
            super(options ?? {})
            this.errors = new ErrorsByPath()
        }

        addUnassignable(def: unknown, args: Allows.Args) {
            this.errors.set(
                this.ctx.path,
                `${stringifyValue(
                    args.value
                )} is not assignable to ${stringifyDef(def)}.`
            )
        }
    }
}
