const User = type({
	name: "string",
	platform: "'android' | 'ios'",
	"version?": "number | string"
})

const selected = User.select({
	kind: "domain",
	where: d => d.domain === "string"
})

const ConfiguredUser = User.configure(
	{ description: "A STRING" },
	{
		kind: "domain",
		where: d => d.domain === "string"
	}
)

ConfiguredUser.get("name").description // A STRING
ConfiguredUser.get("platform").description // "android" | "ios"
ConfiguredUser.get("version").description // a number, A STRING or undefined

import type * as a from "arktype"
import type {
	inferDefinition,
	validateDefinition
} from "arktype/internal/parser/definition.ts"
import type { bindThis } from "arktype/internal/scope.ts"

declare global {
	const type: typeof a.type
	namespace type {
		export type cast<t> = {
			[a.inferred]?: t
		}

		export type errors = a.ArkErrors

		export type validate<
			def,
			$ = {},
			args = bindThis<def>
		> = validateDefinition<def, $, args>

		export type instantiate<def, $ = {}, args = bindThis<def>> = type<
			inferDefinition<def, $, args>,
			$
		>

		export type infer<def, $ = {}, args = bindThis<def>> = inferDefinition<
			def,
			$,
			args
		>

		/** @ts-ignore cast variance */
		export interface Any<out t = any, $ = any> extends a.BaseType<t, $> {}
	}

	type type<t = unknown, $ = {}> = a.Type<t, $>
	const scope: typeof a.scope
	const match: typeof a.match
}

function createBox2<const def>(
	of: type.validate<def>
): type.instantiate<{ of: def }>
function createBox2(of: unknown) {
	return type.raw({
		box: of
	})
}
