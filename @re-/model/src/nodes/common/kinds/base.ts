import { isEmpty } from "@re-/tools"
import {
    appendToPath,
    ErrorsByPath,
    ParseContext,
    stringifyDef,
    stringifyErrors,
    stringifyValue,
    typeDefProxy
} from "../common.js"

export abstract class Base<DefType> {
    constructor(protected def: DefType, protected ctx: ParseContext) {}

    get type() {
        return typeDefProxy
    }

    protected stringifyDef() {
        return stringifyDef(this.def)
    }

    protected appendToPath(segment: string | number) {
        return appendToPath(this.ctx.path, segment)
    }

    protected addUnassignable(value: unknown, errors: ErrorsByPath) {
        errors[this.ctx.path] = `${stringifyValue(
            value
        )} is not assignable to ${this.stringifyDef()}.`
    }

    protected addUnassignableMessage(message: string, errors: ErrorsByPath) {
        errors[this.ctx.path] = message
    }

    validateByPath(value: unknown) {
        const errorsByPath: ErrorsByPath = {}
        this.allows(value, errorsByPath)
        return errorsByPath
    }

    validate(value: unknown) {
        const errorsByPath = this.validateByPath(value)
        return isEmpty(errorsByPath)
            ? { data: value }
            : { error: stringifyErrors(errorsByPath), errorsByPath }
    }

    abstract allows(value: unknown, errors: ErrorsByPath): void
    abstract generate(): unknown
}
