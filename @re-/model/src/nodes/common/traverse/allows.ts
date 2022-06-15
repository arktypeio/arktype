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
    ) => undefined | string | ErrorTree

    export type CustomValidatorArgs = {
        def: unknown
        value: unknown
        getOriginalErrors: () => ErrorsByPath
        path: string
    }

    export type Args = {
        value: unknown
        errors: ErrorTree
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
    ): ErrorTree => {
        const customErrors = validator(args)
        if (!customErrors) {
            return {}
        }
        if (typeof customErrors === "string") {
            return { [args.path]: customErrors }
        }
        return customErrors
    }

    export type ErrorsByPath = Record<string, string>

    export class ErrorBrancher {
        private branches: Record<string, ErrorTree> = {}

        constructor(private parent: ErrorsByPath, private path: string) {}

        branch(name: string) {
            const branchErrors = new ErrorTree()
            this.branches[name] = branchErrors
            return branchErrors
        }

        prune(name: string) {
            delete this.branches[name]
        }

        pruneAll() {
            delete this.parent[this.path]
        }

        merge(name: string) {
            this.parent[this.path] = this.branches[name].toString()
        }

        mergeAll(summary: string) {
            let message = summary
            for (const [name, errors] of Object.entries(this.branches)) {
                message += `\n${name}: ${errors.toString()}`
            }
            this.parent[this.path] = message
        }
    }

    export class ErrorTree {
        private errors: ErrorsByPath = {}

        get count() {
            return Object.keys(this.errors).length
        }

        isEmpty() {
            return this.count === 0
        }

        add(path: string, message: string) {
            this.errors[path] = message
        }

        has(path: string) {
            return path in this.errors
        }

        get(path: string) {
            return this.errors[path]
        }

        all() {
            return this.errors
        }

        split(path: string) {
            return new ErrorBrancher(this.errors, path)
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

    export const createArgs = (value: unknown, options?: Options) => ({
        value,
        errors: new ErrorTree(),
        ctx: Traverse.createContext(),
        cfg: options ?? {}
    })

    export type Config = Options

    // export class Traversal extends Traverse.Traversal<Config> {
    //     errors: ErrorTree
    //     constructor(options?: Options) {
    //         super(options ?? {})
    //         this.errors = new ErrorTree()
    //     }
    // }
}

// export class PathMap<T> extends Map<string, T> {
//     getUnder(path: string) {
//         const results: Record<string, T> = {}
//         for (const [pathToCheck, data] of this.entries()) {
//             if (pathToCheck.startsWith(path)) {
//                 results[path] = data
//             }
//         }
//         return results
//     }

//     deleteUnder(path: string) {
//         for (const k of this.keys()) {
//             if (k.startsWith(path)) {
//                 this.delete(k)
//             }
//         }
//     }

//     setUnder(path: string, dataByRelativePath: Record<string, T>) {
//         this.deleteUnder(path)
//         for (const [pathToSet, data] of Object.entries(dataByRelativePath)) {
//             this.set(pathToSet, data)
//         }
//     }
// }
