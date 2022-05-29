import { TreeOf } from "@re-/tools"
import { ExtractableKeyword } from "./definitions/index.js"
import { validationError, ValidationErrors } from "./errors.js"
import { CustomValidator } from "./model.js"

export * from "./errors.js"

export type ShallowExtractableDefinition =
    | `'${string}'`
    | ExtractableKeyword
    | number
    | bigint

export type ExtractableDefinition = TreeOf<ShallowExtractableDefinition>

// Allow a user to extract types from arbitrary chains of props
export const typeDefProxy: any = new Proxy(() => typeDefProxy, {
    get: (target, prop) => {
        if (prop in target) {
            return (target as any)[prop]
        }
        return typeDefProxy
    }
})

export const errorsFromCustomValidator = (
    customValidator: CustomValidator,
    args: Parameters<CustomValidator>
): ValidationErrors => {
    const result = customValidator(...args)
    if (result && typeof result === "string") {
        return validationError({ path: args[2].ctx.path, message: result })
    } else if (result) {
        return result as ValidationErrors
    }
    return {}
}
