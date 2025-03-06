import type { type } from "arktype"
import type { ArkAmbient } from "arktype/config"

export type FunctionParser<$> = {
	// <ret = unknown>(_?: ":", ret?: type.validate<ret, $>): <
	//     implementation extends () => unknown extends ret
	//         ? unknown
	//         : type.infer<ret, $>
	// >(
	//     implementation: implementation
	// ) => implementation

	<const arg0, ret = unknown>(
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

	<const arg0, const arg1, ret = unknown>(
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

	<const arg0, const arg1, const arg2, ret = unknown>(
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

	<arg0, arg1, arg2, arg3, ret = unknown>(
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

	<arg0, arg1, arg2, arg3, arg4, ret = unknown>(
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
}

export declare const fn: FunctionParser<ArkAmbient.$>

// // // could allow something like `fn("string", ":", "boolean")` to specify return type
// // const z = fn("string", "number")((s, n) => `${n}` === s)
// {
//     // 0 params
//     const implicitReturn = fn()(() => 5)
//     //    ^?
//     const explicitReturn = fn(":", "number")(() => 5)
//     //    ^?
// }

// {
//     // 1 param
//     const implicitReturn = fn("string")((s) => s.length)
//     //    ^?
//     const explicitReturn = fn("string", ":", "number")((s) => s.length)
//     //    ^?
// }

// {
//     // 2 params
//     const implicitReturn = fn("string", "number")((s, n) => s === `${n}`)
//     //    ^?
//     const explicitReturn = fn(
//         //    ^?
//         "string",
//         "number",
//         ":",
//         "boolean"
//     )((s, n) => s === `${n}`)
// }
