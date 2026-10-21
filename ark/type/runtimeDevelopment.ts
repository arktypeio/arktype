// arktype/runtime under the "development" condition, where Node prints errors
// as their issues, so a production build ships nothing for it
import { ArkErrors } from "./runtime.ts"

Object.defineProperty(
	ArkErrors.prototype,
	Symbol.for("nodejs.util.inspect.custom"),
	{
		value(this: ArkErrors) {
			return this.issues
		}
	}
)

export * from "./runtime.ts"
