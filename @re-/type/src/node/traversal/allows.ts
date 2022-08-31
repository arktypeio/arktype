import { ElementOf, Evaluate, IterateType, toString } from "@re-/tools"
import { extraneousKeysError, missingKeyError } from "../../obj/record.js"
import { tupleLengthError } from "../../obj/tuple.js"
import { regexMismatchError } from "../../str/operand/index.js"
import { boundValidationError } from "../../str/operator/bound/bound.js"
import { unionError } from "../../str/operator/exports.js"
import type { base } from "../base.js"
import * as Traverse from "./traverse.js"

export type Args<Value = unknown> = {
    value: Value
    errors: ErrorData[]
    cfg: Options
    ctx: Context
}

export const createArgs = (
    value: unknown,
    options: Options = {},
    modelOptions: Options = {}
): Args => {
    const args = {
        value,
        errors: [],
        ctx: Traverse.createContext(modelOptions) as Context,
        cfg: options
    }
    args.ctx.checkedValuesByAlias = {}
    return args
}

export type Options = {
    ignoreExtraneousKeys?: boolean
    validator?: CustomValidator | "default"
    verbose?: boolean
}

export type Context = Traverse.Context<Options> & {
    checkedValuesByAlias: Record<string, object[]>
}

export type CustomValidator = (
    args: CustomValidatorArgs
) => undefined | string | string[]

export type CustomValidatorArgs = Evaluate<
    BaseErrorContext & {
        getOriginalErrors: () => ErrorData[]
    }
>

export type customError = ErrorData<"Custom">

export const customValidatorAllows = (
    validator: CustomValidator,
    node: base,
    args: Args
): boolean => {
    const context = createBaseErrorContext(node, args)
    const result = getCustomErrorMessages(validator, node, args, context)
    const customMessages = typeof result === "string" ? [result] : result
    if (Array.isArray(customMessages)) {
        args.errors.push(
            ...customMessages.map((message) => ({
                ...context,
                code: "Custom",
                defaultMessage: message
            }))
        )
        return false
    }
    return true
}

export const getCustomErrorMessages = (
    validator: CustomValidator,
    node: base,
    args: Args,
    context: BaseErrorContext
) =>
    validator({
        ...context,
        getOriginalErrors: () => {
            const errors: ErrorData[] = []
            node.allows({
                ...args,
                cfg: { ...args.cfg, validator: "default" },
                errors
            })
            return errors
        }
    })

// export class ErrorTree {
//     toString() {
//         if (this.isEmpty()) {
//             return ""
//         }
//         const entries = Object.entries(this.errors)
//         if (entries.length === 1) {
//             const [path, data] = entries[0]
//             const message = toString(data)
//             if (path) {
//                 return `At ${
//                     isDigits(path) ? "index" : "path"
//                 } ${path}, ${toString(message)}`
//             }
//             return message
//         } else {
//             let aggregatedMessage =
//                 "Encountered errors at the following paths:\n"
//             for (const [path, data] of entries) {
//                 // Display root path (which is internally an empty string) as "/"
//                 aggregatedMessage += `  ${path || "/"}: ${toString(data)}\n`
//             }
//             return aggregatedMessage
//         }
//     }
// }

export const stringifyValue = (value: unknown) =>
    toString(value, {
        maxNestedStringLength: 50
    })

export type BaseErrorContext = {
    path: Traverse.Path
    type: string
    tree: unknown
    value: unknown
}

export const createBaseErrorContext = (
    node: base,
    args: Args
): BaseErrorContext => ({
    type: node.toString(),
    value: args.value,
    path: args.ctx.path,
    tree: node.tree
})

export type ErrorData<
    Code extends string = string,
    SupplementalContext = {}
> = Evaluate<
    {
        code: Code
        defaultMessage: string
    } & BaseErrorContext &
        SupplementalContext
>

type unassignableError = ErrorData<"Unassignable">

type RegisteredErrors = [
    boundValidationError,
    unassignableError,
    tupleLengthError,
    missingKeyError,
    extraneousKeysError,
    regexMismatchError,
    unionError,
    customError
]

export type RegisteredError = ElementOf<RegisteredErrors>

export type ErrorCode = RegisteredError["code"]

type ExtractCodes<
    Listed extends ErrorData[],
    Result = {}
> = Listed extends IterateType<ErrorData, infer Next, infer Rest>
    ? ExtractCodes<
          Rest,
          Result & { [Code in Next["code"]]: Evaluate<Omit<Next, "code">> }
      >
    : Result

export type ErrorsByCode = Evaluate<ExtractCodes<RegisteredErrors>>

type ErrorOptions = {
    [Code in ErrorCode]: {
        disable?: boolean
        message?: (context: ErrorsByCode[Code]) => string
    }
}

export type SupplementalErrorContext<Code extends ErrorCode> = Evaluate<
    Omit<ErrorsByCode[Code], keyof BaseErrorContext>
>
