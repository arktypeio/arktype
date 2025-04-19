import { type } from "arktype"

const Even = type.number.divisibleBy(2)
const By3 = type.number.divisibleBy(3)
const By6 = Even.and(By3)

console.log(By6.description)
By6.extends(By3) //?
By3.extends(By6) //?

export type NaryPipeParser<$, initial = unknown> = {
	(): Type<initial, $>
	<
		a extends Morph<distill.Out<initial>>,
		r = instantiateType<inferMorph<initial, a>, $>
	>(
		a: a
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b]>, $>
	>(
		a: a,
		b: b
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c]>, $>
	>(
		a: a,
		b: b,
		c: c
	): r extends infer _ ? _ : never
}
