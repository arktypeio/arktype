import { decode } from "@jridgewell/sourcemap-codec"
import type { Node, Program, Span } from "oxc-parser"
import { parseModule } from "./module.ts"
import { ModuleScopes } from "./scope.ts"

// A Rollup, Rolldown or Vite build runs each transform after arktype's on what
// arktype's wrote, so a module holding validators ends as those transforms
// built its precompiled code, where its sites are no longer definitions to
// read. This writes the module as those transforms would have built it from
// what reached arktype's: what they changed of what arktype's wrote, token by
// token, is changed in what reached it, a three-way merge. That is what a
// webpack loader after arktype's builds, so one check reads both. The text is
// the module's as it reached arktype's wherever nothing changed, so a comment
// marking a definition still leads it, and its text is the same however
// arktype's wrote the module.

export interface BuiltModule {
	// its file, which names the language it's written in
	id: string
	// as it reached arktype's transform
	reached: string
	// as arktype's transform wrote it, where it did
	written: WrittenModule | undefined
	// as the transforms after arktype's built it
	built: string
}

export interface WrittenModule {
	code: string
	// of its source map, from what it wrote to what reached it
	mappings: string
}

// the module as it reached arktype's, with what the transforms after
// arktype's changed, or undefined where they changed what arktype's wrote
// or it can't be read
export const unwrite = ({
	id,
	reached,
	written,
	built
}: BuiltModule): string | undefined => {
	// one arktype's left as it was reads as it was built, unless a comment
	// there marks a definition, which a transform printing the module drops
	if (!written && !reached.includes(marker)) return built
	const read = tokensOf(id, reached)
	const ours = tokensOf(id, built)
	// one arktype's left as it was is the module as built
	if (!read || !ours) return written ? undefined : built
	const base = written ? tokensOf(id, written.code) : read
	if (!base) return
	// each token arktype's wrote, as the index of the one it read there, or -1
	// where it read none
	const readAt =
		written ?
			readAtOf(base, read, written, reached)
		:	Int32Array.from(read.tokens.keys())
	const edits: Edit[] = []
	const hunks = diff(base, ours)
	for (const [h, [start, end, builtStart, builtEnd]] of hunks.entries()) {
		if (builtStart === builtEnd) {
			// removed: what reached arktype's of it goes too, as a type does
			// that TypeScript's transform erases
			const kept: number[] = []
			for (let i = start; i < end; i++) if (readAt[i] >= 0) kept.push(readAt[i])
			if (!kept.length) continue
			edits.push({
				start: read.tokens[kept[0]].start,
				end: read.tokens[kept[kept.length - 1]].end,
				text: ""
			})
			continue
		}
		if (start === end) {
			// added, with what separates it from the tokens around it
			let [at, from, to] = [start, builtStart, builtEnd]
			const isWritten = () =>
				at > 0 && readAt[at - 1] === -1 && readAt[at] === -1
			// Among the tokens arktype's wrote, it's as much added past the next
			// of them where that's the first it adds, as the `)` closing a call
			// around one arktype's wrote is either of the two then ending it. So
			// it's read as added past the last such token, or else ahead of the
			// first, up to the next thing a transform changed
			const next = h + 1 < hunks.length ? hunks[h + 1][0] : base.tokens.length
			while (
				isWritten() &&
				at < next &&
				base.texts[at] === ours.texts[from] &&
				base.texts[at] === ours.texts[to]
			) {
				at++
				from++
				to++
			}
			if (isWritten()) [at, from, to] = [start, builtStart, builtEnd]
			const previous = h ? hunks[h - 1][1] : 0
			while (
				isWritten() &&
				at > previous &&
				base.texts[at - 1] === ours.texts[to - 1] &&
				base.texts[at - 1] === ours.texts[from - 1]
			) {
				at--
				from--
				to--
			}
			if (isWritten()) {
				// where only the semicolon a transform ends each statement with
				// reads nothing
				if (ours.texts.slice(builtStart, builtEnd).every(text => text === ";"))
					continue
				return
			}
			const before = at > 0 ? readAt[at - 1] : undefined
			const after = at < readAt.length ? readAt[at] : undefined
			// past the token it follows, so ahead of a comment leading the next
			const position =
				before !== undefined && before >= 0 ? read.tokens[before].end
				: after !== undefined && after >= 0 ?
					after ? read.tokens[after - 1].end
					:	0
				: before === undefined ? 0
				: reached.length
			edits.push({
				start: position,
				end: position,
				text: built.slice(
					from ? ours.tokens[from - 1].end : 0,
					to < ours.tokens.length ? ours.tokens[to].start : built.length
				)
			})
			continue
		}
		// written otherwise, which no token arktype's wrote may be
		const first = readAt[start]
		if (first < 0) return
		for (let i = start; i < end; i++)
			if (readAt[i] !== first + i - start) return
		edits.push({
			start: read.tokens[first].start,
			end: read.tokens[first + end - 1 - start].end,
			text: built.slice(
				ours.tokens[builtStart].start,
				ours.tokens[builtEnd - 1].end
			)
		})
	}
	if (!edits.length) return reached
	let unwritten = ""
	let end = 0
	for (const edit of edits) {
		if (edit.start < end) return written ? undefined : built
		unwritten += reached.slice(end, edit.start) + edit.text
		end = edit.end
	}
	unwritten += reached.slice(end)
	const result = tokensOf(id, unwritten)
	if (!written) {
		// each token as built, or the module as built is read as it is
		return result && result.texts.join("\0") === ours.texts.join("\0") ?
				unwritten
			:	built
	}
	if (!result) return
	// ahead of what reads them, past each directive, which must come first
	const directives = result.program.body.filter(
		statement => statement.type === "ExpressionStatement" && statement.directive
	)
	const at = directives.length ? directives[directives.length - 1].end : 0
	return `${unwritten.slice(0, at)}\n${missingImportsOf(result.program, read.program, reached)}${unwritten.slice(at)}`
}

// Where each token arktype's transform wrote is from: a token it kept is one
// its source map has where the same token reached it, and that the two texts
// share where they're read for what differs, and one it wrote is from
// nowhere. Either reading alone takes a token it wrote for one it replaced:
// the texts share the brace of an export it wrote and one of the definition
// that was there, and a map traced through each step that wrote the module
// has a token of the first step's as far past where that step started
// writing as it is, where the definition may hold the same one
const readAtOf = (
	base: ModuleTokens,
	read: ModuleTokens,
	{ code, mappings }: WrittenModule,
	reached: string
): Int32Array => {
	const readAt = new Int32Array(base.tokens.length).fill(-1)
	const lines = decode(mappings)
	const starts = lineStartsOf(code)
	const readStarts = lineStartsOf(reached)
	const byStart = new Map(read.tokens.map((token, i) => [token.start, i]))
	let line = -1
	// where each segment of the line maps to, by the column it starts at
	let mapped = new Map<number, number>()
	// whether the map has a token it wrote where it read another
	const isMapped = (b: number, o: number): boolean => {
		const { start } = base.tokens[b]
		let at = Math.max(line, 0)
		while (at + 1 < starts.length && starts[at + 1] <= start) at++
		if (at !== line) {
			line = at
			mapped = new Map(
				(lines[line] ?? []).flatMap((segment): [number, number][] =>
					segment.length === 1 || segment[2] >= readStarts.length ?
						[]
					:	[[segment[0], readStarts[segment[2]] + segment[3]]]
				)
			)
		}
		// its own segment, as the map has one where each token it kept starts
		const from = mapped.get(start - starts[line])
		return from !== undefined && byStart.get(from) === o
	}
	let [b, o] = [0, 0]
	const keep = () => {
		if (isMapped(b, o)) readAt[b] = o
		b++
		o++
	}
	for (const [start, end, , readEnd] of diff(base, read)) {
		while (b < start) keep()
		b = end
		o = readEnd
	}
	while (b < base.tokens.length) keep()
	return readAt
}

// where each line of a text starts
const lineStartsOf = (text: string): number[] => {
	const starts = [0]
	for (let at = text.indexOf("\n"); at !== -1; at = text.indexOf("\n", at + 1))
		starts.push(at + 1)
	return starts
}

// what starts each comment arktype's reads, as `// @ark-runtime`
const marker = "@ark-"

interface Edit {
	start: number
	end: number
	text: string
}

interface Token extends Span {
	// alike for two tokens a transform printing one as the other leaves alike
	text: string
}

interface ModuleTokens {
	tokens: Token[]
	texts: string[]
	// the tokens of each statement of the module, from the first to past the last
	statements: StatementTokens[]
	program: Program
}

// each import of a name the module reads and no longer declares, as
// TypeScript's transform drops an import only a definition arktype's wrote read
const missingImportsOf = (
	unwritten: Program,
	reached: Program,
	source: string
): string => {
	const unresolved = new Set(
		new ModuleScopes(unwritten).root.unresolved.flatMap(({ id, binding }) =>
			binding ? [] : id.name
		)
	)
	let imports = ""
	for (const statement of reached.body) {
		if (statement.type !== "ImportDeclaration") continue
		if (statement.importKind === "type") continue
		const from = ` from ${source.slice(statement.source.start, statement.source.end)}`
		for (const specifier of statement.specifiers) {
			if (!unresolved.has(specifier.local.name)) continue
			if (specifier.type === "ImportDefaultSpecifier")
				imports += `import ${specifier.local.name}${from}\n`
			else if (specifier.type === "ImportNamespaceSpecifier")
				imports += `import * as ${specifier.local.name}${from}\n`
			else if (specifier.importKind !== "type")
				imports += `import { ${source.slice(specifier.imported.start, specifier.imported.end)} as ${specifier.local.name} }${from}\n`
		}
	}
	return imports
}

// A module's tokens, each a string, regular expression, template part or JSX
// text its tree names, or a word, number or other character of the text
// between them, which holds no quote or slash to misread. A comment is none,
// as a transform printing the module drops it
const tokensOf = (id: string, code: string): ModuleTokens | undefined => {
	const { program, comments, errors } = parseModule(id, code)
	if (errors.length) return
	const named: (Token | Span)[] = [...comments]
	collectNamed(program as never, code, named)
	named.sort((l, r) => l.start - r.start)
	const tokens: Token[] = []
	let at = 0
	for (const span of named) {
		// e.g. a shorthand property's key and value
		if (span.start < at) continue
		readBetween(code, at, span.start, tokens)
		if ("text" in span) tokens.push(span)
		at = span.end
	}
	readBetween(code, at, code.length, tokens)
	const statements: StatementTokens[] = []
	let next = 0
	for (const statement of program.body) {
		const start = next
		while (next < tokens.length && tokens[next].start < statement.end) next++
		if (next > start) statements.push([start, next])
	}
	// a token past the last statement, which nothing a parser reads leaves
	if (next < tokens.length) statements.push([next, tokens.length])
	return {
		tokens,
		texts: tokens.map(token => token.text),
		statements,
		program
	}
}

interface NamedNode extends Span {
	type: string
	value?: unknown
	regex?: object
}

const collectNamed = (
	node: NamedNode,
	code: string,
	named: (Token | Span)[]
): void => {
	const { start, end } = node
	if (node.type === "Literal" && typeof node.value === "string") {
		// by its value, as one transform quotes it otherwise than another
		named.push({ start, end, text: JSON.stringify(node.value) })
	} else if (
		(node.type === "Literal" && node.regex) ||
		node.type === "TemplateElement" ||
		node.type === "JSXText"
	)
		named.push({ start, end, text: code.slice(start, end) })
	for (const key in node) {
		if (key === "parent") continue
		const child = (node as never as Record<string, unknown>)[key]
		if (Array.isArray(child)) {
			for (const item of child)
				if (isNode(item)) collectNamed(item, code, named)
		} else if (isNode(child)) collectNamed(child, code, named)
	}
}

const isNode = (value: unknown): value is NamedNode =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as Partial<Node>).type === "string" &&
	typeof (value as Partial<Node>).start === "number"

const between =
	/\s+|[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*|\d[\p{ID_Continue}.]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|./suy

const readBetween = (
	code: string,
	start: number,
	end: number,
	tokens: Token[]
): void => {
	between.lastIndex = start
	while (between.lastIndex < end) {
		const at = between.lastIndex
		let [text] = between.exec(code)!
		// a word may run past where the next named token starts
		if (at + text.length > end) {
			text = text.slice(0, end - at)
			between.lastIndex = end
		}
		if (text.trim()) tokens.push({ start: at, end: at + text.length, text })
	}
}

// what differs between two lists of tokens: each run of the base's, and the
// run of the other's in its place
type Hunk = [baseStart: number, baseEnd: number, start: number, end: number]

// beyond this many pairs of tokens between two anchors, the run is one hunk
const maxCompared = 4_000_000

// Statements first, then the tokens of each that differs: a token alike in
// two statements, like the `export` that starts one and the `.export()` that
// ends the one before, is never read as the same token of both. Two alike but
// for the semicolon a transform ends each with differ in that alone. Of the
// statements between two alike, those alike in what they declare are compared
// with each other, as a transform writing a statement otherwise leaves what
// it declares. The rest are compared in order where each list has as many,
// and as one run of tokens otherwise
const diff = (base: ModuleTokens, other: ModuleTokens): Hunk[] => {
	const hunks: Hunk[] = []
	const compare = (b0: number, b1: number, o0: number, o1: number) =>
		hunks.push(
			...diffOf(
				base.texts,
				other.texts,
				...tokensIn(base, b0, b1),
				...tokensIn(other, o0, o1)
			)
		)
	const compareEnds = (b: number, o: number) => {
		const end = base.statements[b][1]
		const otherEnd = other.statements[o][1]
		const ends = base.texts[end - 1] === ";"
		if (ends === (other.texts[otherEnd - 1] === ";")) return
		hunks.push(
			ends ?
				[end - 1, end, otherEnd, otherEnd]
			:	[end, end, otherEnd - 1, otherEnd]
		)
	}
	const heads = base.statements.map(headOf(base))
	const otherHeads = other.statements.map(headOf(other))
	let [b, o] = [0, 0]
	for (const [b0, b1, o0, o1] of [
		...diffOf(
			base.statements.map(keyOf(base)),
			other.statements.map(keyOf(other))
		),
		[base.statements.length, base.statements.length, 0, 0]
	]) {
		for (; b < b0; b++, o++) compareEnds(b, o)
		for (const [h0, h1, g0, g1] of [
			...diffOf(heads, otherHeads, b0, b1, o0, o1),
			[b1, b1, o1, o1]
		]) {
			for (; b < h0; b++, o++) compare(b, b + 1, o, o + 1)
			if (h1 - h0 !== g1 - g0) compare(h0, h1, g0, g1)
			else for (; b < h1; b++, o++) compare(b, b + 1, o, o + 1)
			b = h1
			o = g1
		}
	}
	return hunks
}

// the tokens of a module's statements, from one to before another
const tokensIn = (
	{ statements, tokens }: ModuleTokens,
	from: number,
	to: number
): [start: number, end: number] => {
	const start = from < statements.length ? statements[from][0] : tokens.length
	return [start, from === to ? start : statements[to - 1][1]]
}

type StatementTokens = [start: number, end: number]

// a statement's tokens, but for the semicolon a transform ends it with
const keyOf =
	({ texts }: ModuleTokens) =>
	([start, end]: StatementTokens): string =>
		texts.slice(start, texts[end - 1] === ";" ? end - 1 : end).join("\0")

const opensValue = /^[(={]$/

// what a statement declares, as `export const User`, or what it imports from
const headOf =
	({ texts }: ModuleTokens) =>
	([start, end]: StatementTokens): string => {
		if (texts[start] === "import") {
			const from = texts[end - 1] === ";" ? end - 2 : end - 1
			return `import\0${texts[from]}`
		}
		let last = start
		while (last < end && last < start + 6 && !opensValue.test(texts[last]))
			last++
		return texts.slice(start, last).join("\0")
	}

const diffOf = (
	base: string[],
	other: string[],
	from = 0,
	to = base.length,
	otherFrom = 0,
	otherTo = other.length
): Hunk[] => {
	const hunks: Hunk[] = []
	const compare = (b0: number, b1: number, o0: number, o1: number): void => {
		while (b0 < b1 && o0 < o1 && base[b0] === other[o0]) {
			b0++
			o0++
		}
		while (b0 < b1 && o0 < o1 && base[b1 - 1] === other[o1 - 1]) {
			b1--
			o1--
		}
		if (b0 === b1 && o0 === o1) return
		if (b0 === b1 || o0 === o1) return void hunks.push([b0, b1, o0, o1])
		const anchors = anchorsOf(base, other, b0, b1, o0, o1)
		if (anchors.length) {
			let [b, o] = [b0, o0]
			for (const [anchor, otherAnchor] of anchors) {
				compare(b, anchor, o, otherAnchor)
				b = anchor + 1
				o = otherAnchor + 1
			}
			return compare(b, b1, o, o1)
		}
		if ((b1 - b0) * (o1 - o0) > maxCompared)
			return void hunks.push([b0, b1, o0, o1])
		compareEach(base, other, b0, b1, o0, o1, hunks)
	}
	compare(from, to, otherFrom, otherTo)
	return hunks
}

// tokens each list holds once within the runs, in the order both have them,
// as a patience diff finds them: what a module declares or imports is mostly
// named once, so the runs between them stay short however long the module
const anchorsOf = (
	base: string[],
	other: string[],
	b0: number,
	b1: number,
	o0: number,
	o1: number
): [at: number, otherAt: number][] => {
	// its index in each run, -1 once it's there twice
	const found = new Map<string, [at: number, otherAt: number]>()
	for (let i = b0; i < b1; i++) {
		const known = found.get(base[i])
		if (known) known[0] = -1
		else found.set(base[i], [i, -2])
	}
	for (let i = o0; i < o1; i++) {
		const known = found.get(other[i])
		if (known) known[1] = known[1] === -2 ? i : -1
	}
	const pairs = [...found.values()].filter(
		([at, otherAt]) => at >= 0 && otherAt >= 0
	)
	// the longest run of them rising in the other list, already rising in the base
	const tails: number[] = []
	const previous: number[] = []
	for (const [i, [, otherAt]] of pairs.entries()) {
		let [low, high] = [0, tails.length]
		while (low < high) {
			const middle = (low + high) >> 1
			if (pairs[tails[middle]][1] < otherAt) low = middle + 1
			else high = middle
		}
		previous[i] = low ? tails[low - 1] : -1
		tails[low] = i
	}
	const anchors: [number, number][] = []
	for (
		let i = tails.length ? tails[tails.length - 1] : -1;
		i >= 0;
		i = previous[i]
	)
		anchors.push(pairs[i])
	return anchors.reverse()
}

// the hunks of two short runs, by their longest common subsequence
const compareEach = (
	base: string[],
	other: string[],
	b0: number,
	b1: number,
	o0: number,
	o1: number,
	hunks: Hunk[]
): void => {
	const [rows, columns] = [b1 - b0 + 1, o1 - o0 + 1]
	// the length of what the runs from each pair on have in common
	const common = new Uint32Array(rows * columns)
	for (let i = rows - 2; i >= 0; i--) {
		for (let j = columns - 2; j >= 0; j--) {
			common[i * columns + j] =
				base[b0 + i] === other[o0 + j] ?
					common[(i + 1) * columns + j + 1] + 1
				:	Math.max(common[(i + 1) * columns + j], common[i * columns + j + 1])
		}
	}
	let [i, j] = [0, 0]
	let hunk: Hunk | undefined
	while (i < rows - 1 || j < columns - 1) {
		if (i < rows - 1 && j < columns - 1 && base[b0 + i] === other[o0 + j]) {
			i++
			j++
			hunk = undefined
			continue
		}
		if (!hunk) hunks.push((hunk = [b0 + i, b0 + i, o0 + j, o0 + j]))
		if (
			j === columns - 1 ||
			(i < rows - 1 &&
				common[(i + 1) * columns + j] >= common[i * columns + j + 1])
		)
			hunk[1] = b0 + ++i
		else hunk[3] = o0 + ++j
	}
}
