import type { BaseRoot } from "@ark/schema"
import { Callable, throwParseError, type Fn } from "@ark/util"
import type { InternalScope } from "./scope.ts"

export class InternalFnParser extends Callable<(...args: unknown[]) => Fn> {
	constructor($: InternalScope) {
		super((...signature) => {
			const paramTypes: BaseRoot[] = []

			let i = 0
			for (; i < signature.length && signature[i] !== ":"; i++)
				paramTypes[i] = $.parse(signature[i])

			let returnType: BaseRoot | null = null

			if (signature[i] === ":") {
				if (i !== signature.length - 2)
					return throwParseError(badFnReturnTypeMessage)
				returnType = $.parse(signature[i + 1])
			}

			return (impl: Fn) =>
				({
					// preserve name from original function
					[impl.name]: (...args: unknown[]) => {
						const validatedArgs = paramTypes.map((p, i) => p.assert(args[i]))
						const returned = impl(...validatedArgs)
						return returnType ? returnType.assert(returned) : returned
					}
				})[impl.name] as never
		})
	}
}

export const badFnReturnTypeMessage = `":" must be followed by exactly one return type e.g:
fn("string", ":", "number")(s => s.length)`
