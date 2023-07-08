// export type ConstraintsInput<
//     basis extends BasisInput | null = BasisInput | null
// > = BasisInput extends basis
//     ? UnknownConstraintsInput
//     : basis extends BasisInput
//     ? constraintsOf<basis>
//     : functionalConstraints<unknown>

// type UnknownConstraintsInput = {
//     [k in ConstraintKind]?: k extends NodeKind
//         ? k extends "bound"
//             ? BoundGroupInput
//             : ConstraintGroup<k> extends readonly unknown[]
//             ? listable<NodeInputs[k]>
//             : NodeInputs[k]
//         : BasisInput
// }

// export type inferPredicateDefinition<input extends PredicateInput> =
//     input["morph"] extends Morph<any, infer out>
//         ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
//         : input["morph"] extends readonly [...any[], Morph<any, infer out>]
//         ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
//         : inferPredicateInput<input>

// type inferPredicateInput<input extends PredicateInput> =
//     input["narrow"] extends NarrowCast<any, infer narrowed>
//         ? narrowed
//         : input["narrow"] extends List<Narrow>
//         ? inferNarrowArray<input["narrow"]> extends infer result
//             ? isUnknown<result> extends true
//                 ? inferNonFunctionalConstraints<input>
//                 : result
//             : never
//         : inferNonFunctionalConstraints<input>

// type inferNarrowArray<
//     filters extends List,
//     result = unknown
// > = filters extends readonly [infer head, ...infer tail]
//     ? inferNarrowArray<
//           tail,
//           result &
//               (head extends NarrowCast<any, infer narrowed>
//                   ? narrowed
//                   : unknown)
//       >
//     : evaluate<result>

// type inferNonFunctionalConstraints<input extends PredicateInput> =
//     input["basis"] extends BasisInput
//         ? input["props"] extends PropsInput
//             ? inferPropsInput<input["props"]>
//             : inferBasis<input["basis"]>
//         : unknown

// type constraintsOf<basis extends BasisInput> = basis extends Domain
//     ? functionalConstraints<inferDomain<basis>> & domainConstraints<basis>
//     : basis extends AbstractableConstructor
//     ? functionalConstraints<InstanceType<basis>> & classConstraints<basis>
//     : basis extends readonly ["===", infer value]
//     ? // Exact values cannot be filtered, but can be morphed
//       Pick<functionalConstraints<value>, "morph">
//     : never

// type domainConstraints<basis extends Domain> = basis extends "object"
//     ? {
//           props?: PropsInput
//       }
//     : // TODO: narrow bound types
//     basis extends "string"
//     ? {
//           regex?: listable<SerializedRegexLiteral>
//           bound?: Bound
//       }
//     : basis extends "number"
//     ? {
//           divisor?: number
//           bound?: Bound
//       }
//     : {}

// type functionalConstraints<input> = {
//     narrow?: listable<Narrow<input>>
//     // TODO: remove?
//     morph?: listable<Morph<input>>
// }

// type classConstraints<base extends AbstractableConstructor> = base extends
//     | typeof Array
//     | typeof Date
//     ? {
//           props?: PropsInput
//           bound?: Bound
//       }
//     : {
//           props?: PropsInput
//       }

// export type basisNodeFrom<input extends BasisInput> = input extends Domain
//     ? DomainNode
//     : input extends AbstractableConstructor
//     ? ClassNode
//     : UnitNode

// export const parseBasisInput = (
//     input: BasisInput,
//     // TODO: should be correlated with/part of input?
//     meta: {}
// ): DomainNode | ClassNode | UnitNode => {
//     switch (typeof input) {
//         case "string":
//             return new DomainNode(input, meta)
//         case "object":
//             return new UnitNode(input[1], meta)
//         case "function":
//             return new ClassNode(input, meta)
//         default:
//             return throwInternalError(
//                 `Unexpectedly got a basis input of type ${domainOf(input)}`
//             )
//     }
// }
