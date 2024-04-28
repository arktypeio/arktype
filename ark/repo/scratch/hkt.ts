// import type { Hkt } from "@arktype/util"

// // Custom user type
// interface Chunk<T> {
// 	t: T
// 	isChunk: true
// }

// // User defines the HKT signature
// interface ToChunk extends Hkt.Kind {
// 	f(x: this[Hkt.key]): Chunk<typeof x>
// }

// Original HKT implementation:
// export type Module<r extends Resolutions = any> = {
// 	// just adding the nominal id this way and mapping it is cheaper than an intersection
// 	[k in exportedName<r> | arkKind]: k extends string
// 		? [r["exports"][k]] extends [never]
// 			? Type<never, $<r>>
// 			: isAny<r["exports"][k]> extends true
// 			? Type<any, $<r>>
// 			: r["exports"][k] extends Kind<any>
// 			? <const def>(
// 					def: validateTypeRoot<def, $<r>>
// 			  ) => inferTypeRoot<def, $<r>> extends infer t
// 					? Apply<r["exports"][k], t>
// 					: never
// 			: r["exports"][k] extends PreparsedResolution
// 			? r["exports"][k]
// 			: Type<r["exports"][k], $<r>>
// 		: // set the nominal symbol's value to something validation won't care about
// 		  // since the inferred type will be omitted anyways
// 		  CastTo<"module">
// }

///** These are legal as values of a scope but not as definitions in other contexts */
// Note this will have to be updated to distinguish Kind from NodeKinds
// type PreparsedResolution = Module | GenericProps | Kind

// export type parseUnenclosed<
//     s extends StaticState,
//     $,
//     args
// > = Scanner.shiftUntilNextTerminator<
//     s["unscanned"]
// > extends Scanner.shiftResult<infer token, infer unscanned>
//     ? token extends "keyof"
//         ? state.addPrefix<s, "keyof", unscanned>
//         : tryResolve<s, token, $, args> extends infer result
//         ? result extends error<infer message>
//             ? state.error<message>
//             : result extends keyof $
//             ? $[result] extends Kind
//                 ? parseKindInstantiation<
//                       token,
//                       $[result],
//                       state.scanTo<s, unscanned>,
//                       $,
//                       args
//                   >
//                 : $[result] extends GenericProps
//                 ? parseGenericInstantiation<
//                       token,
//                       $[result],
//                       state.scanTo<s, unscanned>,
//                       $,
//                       args
//                   >
//                 : state.setRoot<s, result, unscanned>
//             : state.setRoot<s, result, unscanned>
//         : never
//     : never

// export type parseKindInstantiation<
//     name extends string,
//     k extends Kind,
//     s extends StaticState,
//     $,
//     args
//     // have to skip whitespace here since TS allows instantiations like `Partial    <T>`
// > = Scanner.skipWhitespace<s["unscanned"]> extends `<${infer unscanned}`
//     ? parseGenericArgs<name, ["t"], unscanned, $, args> extends infer result
//         ? result extends ParsedArgs<infer argAsts, infer nextUnscanned>
//             ? state.setRoot<
//                   s,
//                   CastTo<Apply<k, inferAst<argAsts[0], $, args>>>,
//                   nextUnscanned
//               >
//             : // propagate error
//               result
//         : never
//     : state.error<writeInvalidGenericArgsMessage<name, ["t"], []>>

// export type inferTerminal<token, $, args> = token extends keyof args | keyof $
//     ? resolve<token, $, args>
//     // Added this for HKTs, could be less hacky?
//     : token extends CastTo<infer t>
//     ? t
//     : token extends StringLiteral<infer Text>
//     ? Text
//     : token extends RegexLiteral
//     ? string
//     : token extends DateLiteral
//     ? Date
//     : token extends NumberLiteral<infer value>
//     ? value
//     : token extends BigintLiteral<infer value>
//     ? value
//     : never

// // User can now reference the HKT in any ArkType syntax with autocompletion

// const s = scope({
// 	foo: "string",
// 	toChunk: {} as ToChunk,
// 	dateChunkArray: "Array<toChunk<Date>>"
// }).export()

// // Generics can also be instantiated after the scope is defined
// const t = s.toChunk("toChunk<boolean[]>")
// //    ^?
