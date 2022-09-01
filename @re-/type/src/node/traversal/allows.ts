import {
    ElementOf,
    Evaluate,
    IterateType,
    toString,
    uncapitalize
} from "@re-/tools"
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
    // TODO: Add verbose as an option for unions
    // verbose?: boolean
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
                message
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

export const stringifyValue = (value: unknown) =>
    toString(value, {
        maxNestedStringLength: 50
    })

export type BaseErrorContext = {
    path: Traverse.Path
    definition: string
    tree: unknown
    data: unknown
}

export const createBaseErrorContext = (
    node: base,
    args: Args
): BaseErrorContext => ({
    definition: node.toString(),
    data: args.value,
    path: args.ctx.path,
    tree: node.tree
})

export type ErrorData<
    Code extends string = string,
    SupplementalContext = {}
> = Evaluate<
    {
        code: Code
        message: string
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

export class CheckError extends Error {}

export class ErrorResult extends Array<ErrorData> {
    constructor(...errors: ErrorData[]) {
        super(...errors)
    }

    get summary() {
        if (this.length === 1) {
            const error = this[0]
            if (error.path.length) {
                return `At path ${error.path.join("/")}, ${uncapitalize(
                    error.message
                )}`
            }
            return error.message
        }
        let aggregatedMessage = "Encountered errors at the following paths:\n"
        for (const error of this) {
            // Display root path as "/"
            aggregatedMessage += `  ${
                error.path.length ? error.path.join("/") : "/"
            }: ${error.message}\n`
        }
        return aggregatedMessage
    }
}
