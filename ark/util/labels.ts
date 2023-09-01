export type applyElementLabels<
	t extends readonly unknown[],
	labels extends readonly unknown[]
> = labels extends [unknown, ...infer labelsTail]
	? t extends readonly [infer head, ...infer tail]
		? readonly [
				...labelElement<head, labels>,
				...applyElementLabels<tail, labelsTail>
		  ]
		: applyOptionalElementLabels<Required<t>, labels>
	: t

type applyOptionalElementLabels<
	t extends readonly unknown[],
	labels extends readonly unknown[]
> = labels extends readonly [unknown, ...infer labelsTail]
	? t extends readonly [infer head, ...infer tail]
		? [
				...labelOptionalElement<head, labels>,
				...applyOptionalElementLabels<tail, labelsTail>
		  ]
		: applyRestElementLabels<t, labels>
	: t

type applyRestElementLabels<
	t extends readonly unknown[],
	labels extends readonly unknown[]
> = t extends readonly []
	? []
	: labels extends readonly [unknown, ...infer tail]
	? [...labelOptionalElement<t[0], labels>, ...applyRestElementLabels<t, tail>]
	: t

type labelElement<
	element,
	labels extends readonly unknown[]
> = labels extends readonly [unknown]
	? { [K in keyof labels]: element }
	: labels extends readonly [...infer head, unknown]
	? labelElement<element, head>
	: [_: element]

type labelOptionalElement<
	element,
	label extends readonly unknown[]
> = label extends readonly [unknown]
	? { [K in keyof label]?: element }
	: label extends readonly [...infer head, unknown]
	? labelOptionalElement<element, head>
	: [_?: element]
