import type { Ark, inferTypeRoot, validateTypeRoot } from "../../type/main.js"

export type FunctionParser<$> = {
	// <ret = unknown>(_?: ":", ret?: validateTypeRoot<ret, $>): <
	//     implementation extends () => unknown extends ret
	//         ? unknown
	//         : inferTypeRoot<ret, $>
	// >(
	//     implementation: implementation
	// ) => implementation

	<arg0, ret = unknown>(
		arg0: validateTypeRoot<arg0, $>,
		_?: ":",
		ret?: validateTypeRoot<ret, $>
	): <
		implementation extends (
			arg0: inferTypeRoot<arg0, $>
		) => unknown extends ret ? unknown : inferTypeRoot<ret, $>
	>(
		implementation: implementation
	) => implementation

	<arg0, arg1, ret = unknown>(
		arg0: validateTypeRoot<arg0, $>,
		arg1: validateTypeRoot<arg1, $>,
		_?: ":",
		ret?: validateTypeRoot<ret, $>
	): <
		implementation extends (
			arg0: inferTypeRoot<arg0, $>,
			arg1: inferTypeRoot<arg1, $>
		) => unknown extends ret ? unknown : inferTypeRoot<ret, $>
	>(
		implementation: implementation
	) => implementation

	<arg0, arg1, arg2, ret = unknown>(
		arg0: validateTypeRoot<arg0, $>,
		arg1: validateTypeRoot<arg1, $>,
		arg2: validateTypeRoot<arg2, $>,
		_?: ":",
		ret?: validateTypeRoot<ret, $>
	): <
		implementation extends (
			arg0: inferTypeRoot<arg0, $>,
			arg1: inferTypeRoot<arg1, $>,
			arg2: inferTypeRoot<arg2, $>
		) => unknown extends ret ? unknown : inferTypeRoot<ret, $>
	>(
		implementation: implementation
	) => implementation

	<arg0, arg1, arg2, arg3, ret = unknown>(
		arg0: validateTypeRoot<arg0, $>,
		arg1: validateTypeRoot<arg1, $>,
		arg2: validateTypeRoot<arg2, $>,
		arg3: validateTypeRoot<arg3, $>,
		_?: ":",
		ret?: validateTypeRoot<ret, $>
	): <
		implementation extends (
			arg0: inferTypeRoot<arg0, $>,
			arg1: inferTypeRoot<arg1, $>,
			arg2: inferTypeRoot<arg2, $>,
			arg3: inferTypeRoot<arg3, $>
		) => unknown extends ret ? unknown : inferTypeRoot<ret, $>
	>(
		implementation: implementation
	) => implementation

	<arg0, arg1, arg2, arg3, arg4, ret = unknown>(
		arg0: validateTypeRoot<arg0, $>,
		arg1: validateTypeRoot<arg1, $>,
		arg2: validateTypeRoot<arg2, $>,
		arg3: validateTypeRoot<arg3, $>,
		arg4: validateTypeRoot<arg4, $>,
		_?: ":",
		ret?: validateTypeRoot<ret, $>
	): <
		implementation extends (
			arg0: inferTypeRoot<arg0, $>,
			arg1: inferTypeRoot<arg1, $>,
			arg2: inferTypeRoot<arg2, $>,
			arg3: inferTypeRoot<arg3, $>,
			arg4: inferTypeRoot<arg4, $>
		) => unknown extends ret ? unknown : inferTypeRoot<ret, $>
	>(
		implementation: implementation
	) => implementation
}

export declare const fn: FunctionParser<Ark>

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
