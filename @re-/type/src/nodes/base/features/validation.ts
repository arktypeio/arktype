import { isDigits, uncapitalize } from "@re-/tools"
import { defToString, stringifyValue } from "../utils.js"
import { Parsing } from "./parsing.js"
import { Traversal } from "./traversal.js"

export type CustomValidator = Validation.CustomValidator

export namespace Validation {
    export type Options = {
        ignoreExtraneousKeys?: boolean
        validator?: CustomValidator | "default"
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

    export type Context = Traversal.Context<Config> & {
        checkedValuesByAlias: Record<string, object[]>
    }

    export type Args = {
        value: unknown
        errors: ErrorTree
        cfg: Config
        ctx: Context
    }

    export class ValidationError extends Error {
        paths: ErrorsByPath
        constructor(errors: ErrorTree) {
            super(errors.toString())
            this.paths = errors.all()
        }
    }

    export const buildUnassignableErrorMessage = (
        def: unknown,
        value: unknown
    ) => `${stringifyValue(value)} is not assignable to ${defToString(def)}.`

    export const customValidatorAllows = (
        validator: CustomValidator,
        node: Parsing.Node,
        args: Args
    ): boolean => {
        const customErrors = validator({
            value: args.value,
            path: args.ctx.path,
            // TODO: Need to figure out what params to provide here now that we don't have def on every node
            def: "def" in node ? (node as any).def : node.toString(),
            getOriginalErrors: () => {
                const branchedErrors = args.errors.split(args.ctx.path)
                const originalErrors = branchedErrors.branch("original")
                node.allows({
                    ...args,
                    cfg: { ...args.cfg, validator: "default" },
                    errors: originalErrors
                })
                return originalErrors.all()
            }
        })
        if (typeof customErrors === "string") {
            args.errors.add(args.ctx.path, customErrors)
            return false
        }
        if (typeof customErrors === "object") {
            args.errors.assign(customErrors)
            return false
        }
        return true
    }

    export type ErrorsByPath = Record<string, string>

    export class ErrorBrancher {
        private branches: Record<string, ErrorTree> = {}

        constructor(private parent: ErrorTree, private path: string) {}

        branch(name: string) {
            const branchErrors = new ErrorTree()
            this.branches[name] = branchErrors
            return branchErrors
        }

        prune(name: string) {
            delete this.branches[name]
        }

        merge(name: string) {
            this.parent.add(this.path, this.branches[name].toString())
        }

        mergeAll(summary: string) {
            let message = summary
            for (const [name, errors] of Object.entries(this.branches)) {
                message += `\n${name}: ${errors.toString()}`
            }
            this.parent.add(this.path, message)
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

        assign(errors: ErrorsByPath) {
            Object.assign(this.errors, errors)
        }

        has(path: string) {
            return path in this.errors
        }

        get(path: string) {
            return this.errors[path]
        }

        delete(path: string) {
            delete this.errors[path]
        }

        all() {
            return this.errors
        }

        split(path: string) {
            return new ErrorBrancher(this, path)
        }

        toString() {
            if (this.isEmpty()) {
                return ""
            }
            const entries = Object.entries(this.errors)
            if (entries.length === 1) {
                const [path, message] = entries[0]
                if (path) {
                    return `At ${
                        isDigits(path) ? "index" : "path"
                    } ${path}, ${uncapitalize(message)}`
                }
                return message
            } else {
                let aggregatedMessage =
                    "Encountered errors at the following paths:\n"
                for (const [path, message] of entries) {
                    // Display root path (which is internally an empty string) as "/"
                    aggregatedMessage += `  ${path || "/"}: ${message}\n`
                }
                return aggregatedMessage
            }
        }
    }

    export const createArgs = (
        value: unknown,
        options: Options = {},
        modelOptions: Options = {}
    ): Validation.Args => {
        const args = {
            value,
            errors: new ErrorTree(),
            ctx: Traversal.createContext(modelOptions) as Context,
            cfg: options
        }
        args.ctx.checkedValuesByAlias = {}
        return args
    }

    export type Config = Options
}
