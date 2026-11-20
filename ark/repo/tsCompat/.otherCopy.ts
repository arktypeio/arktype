// another copy of arktype in the program, like a dependency's 2.x, declares
// its environment on the global ArkEnv, as 2.x does. This copy's ArkEnv is
// its module's, so neither copy's declarations reach the other: were it the
// global, the two would merge, Uint8Array (which 2.x lacks) would be
// unresolvable here, and this program's onFail would retype 2.x's calls
import { type } from "arktype"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { configure } from "arktype/config"

declare global {
	interface ArkEnv {
		$(): { string: string }
		onFail(errors: unknown): "2.x errors"
	}

	namespace ArkEnv {
		type onFail = ReturnType<ArkEnv["onFail"]>
	}
}

export declare const parseWith2x: (data: unknown) => number | ArkEnv.onFail

export const config = configure({ onFail: errors => errors.throw() })

declare module "arktype" {
	interface ArkEnv {
		onFail: typeof config.onFail
	}
}

type equals<l, r> =
	(<t>() => t extends l ? 1 : 0) extends <t>() => t extends r ? 1 : 0 ? true
	:	false

export const Payload = type({ bytes: "Uint8Array", name: "string" })

export const payload: equals<
	typeof Payload.infer,
	{ bytes: Uint8Array; name: string }
> = true

// this copy's onFail throws, so a call returns only data
export const name: equals<
	ReturnType<typeof Payload>,
	typeof Payload.infer
> = true

export const parsed: equals<
	ReturnType<typeof parseWith2x>,
	number | "2.x errors"
> = true
