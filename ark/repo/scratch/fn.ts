import type { type } from "arktype"
import type { ArkAmbient } from "arktype/config"

export type FunctionParser<$> = {
	<const ret = unknown>(
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends () => unknown extends ret ? unknown
		:	type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<const arg0, const ret = unknown>(
		arg0: type.validate<arg0, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<const arg0, const arg1, const ret = unknown>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<const arg0, const arg1, const arg2, const ret = unknown>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<const arg0, const arg1, const arg2, const arg3, const ret = unknown>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14,
		const arg15,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>,
		arg15: type.validate<arg15, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>,
			arg15: type.infer<arg15, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14,
		const arg15,
		const arg16,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>,
		arg15: type.validate<arg15, $>,
		arg16: type.validate<arg16, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>,
			arg15: type.infer<arg15, $>,
			arg16: type.infer<arg16, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14,
		const arg15,
		const arg16,
		const arg17,
		const ret = unknown
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>,
		arg15: type.validate<arg15, $>,
		arg16: type.validate<arg16, $>,
		arg17: type.validate<arg17, $>,
		_?: ":",
		ret?: type.validate<ret, $>
	): <
		implementation extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>,
			arg15: type.infer<arg15, $>,
			arg16: type.infer<arg16, $>,
			arg17: type.infer<arg17, $>
		) => unknown extends ret ? unknown : type.infer<ret, $>
	>(
		implementation: implementation
	) => implementation
}

export declare const fn: FunctionParser<ArkAmbient.$>

// // could allow something like `fn("string", ":", "boolean")` to specify return type
// const z = fn("string", "number")((s, n) => `${n}` === s)
{
	// 0 params
	const implicitReturn = fn()(() => 5)
	//    ^?
	const explicitReturn = fn(":", "number")(() => 5)
	//    ^?
}

{
	// 1 param
	const implicitReturn = fn("string")(s => s.length)
	//    ^?
	const explicitReturn = fn("string", ":", "number")(s => s.length)
	//    ^?
}

{
	// 2 params
	const implicitReturn = fn("string", "number")((s, n) => s === `${n}`)
	//    ^?
	const explicitReturn = fn(
		//    ^?
		"string",
		"number",
		":",
		"boolean"
	)((s, n) => s === `${n}`)
}

const explicitReturn = fn(
	//    ^?
	"string",
	"number",
	":",
	"boolean"
)((s, n) => s === `${n}`)
