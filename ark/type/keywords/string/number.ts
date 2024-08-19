const parsableNumber = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
).internal as IntersectionNode

const number = rootNode({
	in: parsableNumber,
	morphs: (s: string) => Number.parseFloat(s)
})
