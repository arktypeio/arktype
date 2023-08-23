export type composeTraits<
	traits extends readonly Trait[],
	result extends Base = Base<{}>
> = traits extends readonly [
	infer head extends Trait,
	...infer tail extends readonly Trait[]
]
	? composeTraits<tail, result & ReturnType<head>>
	: result

export type Base<instance = object> = abstract new (...args: any[]) => instance

export type Trait<instance = object> = (base: Base<instance>) => Base<instance>

export const compose = <traits extends readonly Trait[]>(...traits: traits) =>
	traits.reduce(
		(base, trait) => {
			abstract class extended extends base {
				constructor(...args: any[]) {
					super(...args)
					trait.apply(this, args)
				}
			}
			return extended
		},
		class {} as Base
	) as {} as composeTraits<traits>
