export type composeTraits<
	traits extends readonly Trait[],
	args extends readonly any[] = [],
	instance = {}
> = traits extends readonly [
	Trait<infer traitArgs, infer traitInstance>,
	...infer tail extends readonly Trait[]
]
	? composeTraits<
			tail,
			intersectArgs<args, traitArgs>,
			instance & traitInstance
	  >
	: abstract new (...args: args) => instance

type intersectArgs<
	l extends readonly any[],
	r extends readonly any[]
> = l extends readonly [infer lHead, ...infer lTail]
	? r extends readonly [infer rHead, ...infer rTail]
		? readonly [lHead & rHead, ...intersectArgs<lTail, rTail>]
		: l
	: r

export type Base<
	args extends readonly any[] = readonly any[],
	instance = object
> = abstract new (...args: args) => instance

export type Trait<
	args extends readonly any[] = readonly any[],
	instance = object
> = (base: Base<never[], instance>) => Base<args, instance>

export const compose = <traits extends readonly Trait[]>(...traits: traits) =>
	traits.reduce<Base>(
		(base, trait) => {
			abstract class extended extends base {
				constructor(...args: any[]) {
					super(...args)
					trait.apply(this, args)
				}
			}
			return extended
		},
		class {}
	) as {} as composeTraits<traits>
