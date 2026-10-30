import { existsSync } from "node:fs"
import { join } from "node:path"
import {
	Node,
	Project,
	SyntaxKind,
	type JSDoc,
	type JSDocableNode,
	type SourceFile
} from "ts-morph"
import { bootstrapFs, bootstrapUtil, repoDirs } from "./shared.ts"

const { flatMorph, throwInternalError, emojiToUnicode } = bootstrapUtil
const { writeFile } = bootstrapFs

const inheritDocToken = "@inheritDoc"

// used to delimit notes in JSDoc.
// add to the list if you need new ones!
const noteEmoji = ["✅", "🥸", "⚠️", "🔗"]

const noteEmojiUnicode = noteEmoji.map(emojiToUnicode)
const noteDelimiterRegex = new RegExp(`(?=\\n\\s*[-${noteEmojiUnicode}])`, "u")
const noteMarkerRegex = new RegExp(`^(?:-|${noteEmoji.join("|")})\\s*`, "u")

const replacedDecorators = {
	"@typeonly": "🥸 inference-only property that will be `undefined` at runtime",
	"@typenoop": "🥸 inference-only function that does nothing at runtime",
	"@chainedDefinition":
		"⚠️ unlike most other methods, this creates a definition rather than a Type",
	"@predicateCast":
		"🥸 {@link https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates | Type predicates} can be used as casts",
	"@ignoresMeta":
		"✅ ignores associated {@link meta}, which does not affect the set of allowed values",
	"@propString":
		"✅ uses `.access` {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors#dot_notation | where allowed by JS}, falling back to `[indexAccess]`\n" +
		`@example
const path = ["key1", Symbol("key2"), "key3", 4, "~key5"]
const propString = 'key1[Symbol(key2)].key3[4]["~key5"]'`
} as const

/**
 * Each section of the Type API page renders one of these groups, in this
 * order. Every member of a Type must be listed here or in
 * {@link typeMembersInProse}, so a new member can't silently go undocumented.
 */
const typeApiGroups = {
	Validation: ["assert", "allows", "from"],
	Inference: [
		"infer",
		"inferIn",
		"inferOut",
		"inferIntrospectableOut",
		"t",
		"as",
		"brand"
	],
	Metadata: ["description", "expression", "meta", "configure", "describe"],
	Composition: ["and", "or", "intersect", "array", "optional", "default"],
	Morphs: ["narrow", "filter", "pipe", "to", "in", "out", "encode"],
	Comparison: [
		"equals",
		"ifEquals",
		"extends",
		"ifExtends",
		"overlaps",
		"extract",
		"exclude"
	],
	Objects: [
		"get",
		"pick",
		"omit",
		"merge",
		"required",
		"partial",
		"map",
		"props",
		"onUndeclaredKey",
		"onDeepUndeclaredKey"
	],
	Serialization: ["json", "toJSON", "toJsonSchema", "~standard"],
	Introspection: ["$", "precompilation", "select"]
} as const satisfies Record<string, readonly string[]>

/** members with no JSDoc, or that need more than a row, written in type-api/index.mdx */
const typeMembersInProse = [
	"distribute",
	"readonly",
	"keyof",
	"internal",
	"matching",
	"atLeastLength",
	"atMostLength",
	"moreThanLength",
	"lessThanLength",
	"exactlyLength",
	"divisibleBy",
	"atLeast",
	"atMost",
	"moreThan",
	"lessThan",
	"atOrAfter",
	"atOrBefore",
	"laterThan",
	"earlierThan"
]

type TypeApiGroup = keyof typeof typeApiGroups

const typeApiGroupByMember: Record<string, TypeApiGroup> = flatMorph(
	typeApiGroups,
	(group, names) => names.map(name => [name, group] as const)
)

/** links for {@link} references to names that have no row on their page */
const referenceUrls: Record<string, string> = {
	Scope: "https://arktype.io/docs/scopes",
	"type.errors": "https://arktype.io/docs/errors",
	ArkErrors: "https://arktype.io/docs/errors",
	ArkError: "https://arktype.io/docs/errors"
}

const typeBuildDir = join(repoDirs.arkDir, "type", "out")
const typeBuildGlob = `${typeBuildDir}/**/*.d.ts`
const schemaBuildDir = join(repoDirs.arkDir, "schema", "out")
const schemaBuildGlob = `${schemaBuildDir}/**/*.d.ts`
const docsComponentsDir = join(repoDirs.docs, "components")
const apiDataPath = join(docsComponentsDir, "apiData.ts")

let updateCount = 0
let apiDocsByGroup: ApiDocsByGroup = {} as ApiDocsByGroup

export const jsDocGen = () => {
	const project = createProject()

	const sourceFiles = project.getSourceFiles()

	console.log(
		`✍️ Generating JSDoc for ${sourceFiles.length} files in ${typeBuildDir} and ${schemaBuildDir}...`
	)

	for (const file of project.getSourceFiles()) docgenForFile(file)

	project.saveSync()

	const docs = getAllJsDoc(project)

	const blocks = docs.flatMap(doc => parseBlock(doc) ?? [])

	assertTypeMembersCovered(project, blocks)

	const traversalNames = blocks
		.filter(block => block.group === "Traversal")
		.map(block => block.name)
	const typeApiNames = [
		...Object.keys(typeApiGroupByMember),
		...typeMembersInProse
	]

	for (const block of blocks) {
		const pageNames =
			block.group === "Traversal" ? traversalNames : typeApiNames
		block.summary = block.summary.map(part => resolveReference(part, pageNames))
		block.notes = block.notes.map(note =>
			note.map(part => resolveReference(part, pageNames))
		)
	}

	// Type rows follow typeApiGroups, Traversal rows their source order
	blocks.sort(
		(l, r) => typeApiNames.indexOf(l.name) - typeApiNames.indexOf(r.name)
	)

	apiDocsByGroup = flatMorph(blocks, (i, block) => [
		{ group: block.group },
		block
	])

	writeApiDataFile()

	console.log(
		`📚 Successfully updated ${updateCount} JSDoc comments on your build output.`
	)
}

export const writeApiDataFile = () => {
	writeFile(
		apiDataPath,
		`import type { ApiDocsByGroup } from "../../repo/jsdocGen.ts"

/** THIS FILE IS AUTOGENERATED FROM ark/repo/jsdocGen.ts **/
// prettier-ignore
export const apiDocsByGroup: ApiDocsByGroup = ${JSON.stringify(apiDocsByGroup, null, 4)}
`
	)
}

export const getAllJsDoc = (project: Project) => {
	const sourceFiles = project.getSourceFiles()

	return sourceFiles.flatMap(file =>
		file.getDescendantsOfKind(SyntaxKind.JSDoc)
	)
}

export type ApiGroup = TypeApiGroup | "Traversal"

export type JsDocComment = ReturnType<JSDoc["getComment"]>

export type RawJsDocPart = Extract<
	JsDocComment,
	readonly unknown[]
>[number] & {}

export type ParsedJsDocPart =
	| { kind: "text"; value: string }
	| { kind: "noteStart"; value: string; warning?: true }
	| { kind: "reference"; value: string }
	| { kind: "link"; value: string; url: string }

export type ApiDocsByGroup = {
	readonly [k in ApiGroup]: readonly ParsedJsDocBlock[]
}

export type ParsedJsDocBlock = {
	group: ApiGroup
	name: string
	/** a method's parameter names; absent for properties */
	params?: string[]
	summary: ParsedJsDocPart[]
	notes: ParsedJsDocPart[][]
	example?: string
	experimental?: ParsedJsDocPart[]
}

const createProject = () => {
	const project = new Project()

	assertBuildDirExists(typeBuildDir)
	assertBuildDirExists(schemaBuildDir)

	project.addSourceFilesAtPaths(typeBuildGlob)
	project.addSourceFilesAtPaths(schemaBuildGlob)

	return project
}

const assertBuildDirExists = (path: string) => {
	if (!existsSync(path)) {
		throw new Error(
			`jsDocGen rewrites ${path} but that directory doesn't exist. Did you run "pnpm build" there first?`
		)
	}
}

const isTypeVariantFile = (file: SourceFile) =>
	file.getFilePath().includes("/type/out/variants/")

const memberName = (node: Node | undefined): string | undefined =>
	(
		Node.isPropertySignature(node) ||
		Node.isMethodSignature(node) ||
		Node.isGetAccessorDeclaration(node)
	) ?
		node
			.getNameNode()
			.getText()
			.replace(/^"(.*)"$/, "$1")
	:	undefined

const extractNameAndGroup = (
	doc: JSDoc
): { name: string; group: ApiGroup } | undefined => {
	if (isTypeVariantFile(doc.getSourceFile())) {
		const name = memberName(doc.getParent())
		if (!name || !(name in typeApiGroupByMember)) return
		return { name, group: typeApiGroupByMember[name] }
	}

	if (!doc.getSourceFile().getFilePath().endsWith("traversal.d.ts")) return

	const name =
		doc.getNextSiblingIfKind(SyntaxKind.Identifier)?.getText() ??
		doc.getParentIfKind(SyntaxKind.GetAccessor)?.getName()

	// the Traversal table lists only members whose JSDoc opens with a heading
	if (!name || !doc.getInnerText().trim().startsWith("#")) return

	return { name, group: "Traversal" }
}

const assertTypeMembersCovered = (
	project: Project,
	blocks: ParsedJsDocBlock[]
) => {
	const generated = new Set(blocks.map(block => block.name))
	const members = new Set(
		project
			.getSourceFiles()
			.filter(isTypeVariantFile)
			.flatMap(file => file.getInterfaces())
			.filter(i => i.getName() === "Type" || i.getName() === "Inferred")
			.flatMap(i => i.getMembers())
			.filter(member => !member.getJsDocs().some(isDeprecated))
			.flatMap(member => memberName(member) ?? [])
			// a computed key like [inferred] has no name to document
			.filter(name => !name.startsWith("["))
	)

	const problems = [
		...[...members]
			.filter(
				name => !generated.has(name) && !typeMembersInProse.includes(name)
			)
			.map(
				name =>
					`${name} is a member of Type but is in neither typeApiGroups nor typeMembersInProse`
			),
		...Object.keys(typeApiGroupByMember)
			.filter(name => !generated.has(name))
			.map(name => `${name} is in typeApiGroups but has no JSDoc to generate`)
	]

	if (problems.length) {
		throw new Error(
			`jsDocGen can't document every Type member:\n${problems.join("\n")}`
		)
	}
}

const isDeprecated = (doc: JSDoc) =>
	doc.getTags().some(tag => tag.getTagName() === "deprecated")

const organizeDocParts = (
	allParts: ParsedJsDocPart[]
): {
	summary: ParsedJsDocPart[]
	notes: ParsedJsDocPart[][]
} => {
	const summary: ParsedJsDocPart[] = []
	const notes: ParsedJsDocPart[][] = []

	if (allParts[0]?.kind === "text") {
		allParts[0].value = allParts[0].value.replace(/^\s*#+\s*/, "")
		if (allParts[0].value === "") allParts.shift()
	}

	for (const part of allParts) {
		if (part.kind === "noteStart") notes.push(part.value ? [part] : [])
		else if (part.value === "") continue
		else if (notes.length) notes[notes.length - 1]!.push(part)
		else summary.push(part)
	}

	return {
		summary: trimParts(summary),
		notes: notes.map(trimParts).filter(note => note.length)
	}
}

/**
 * Parts keep the whitespace between them, so text around a {@link} reads
 * as written; only the ends of a summary or note are trimmed.
 */
const trimParts = (parts: ParsedJsDocPart[]): ParsedJsDocPart[] => {
	const trimmed = parts.map((part, i) => ({
		...part,
		value:
			i === 0 && i === parts.length - 1 ? part.value.trim()
			: i === 0 ? part.value.trimStart()
			: i === parts.length - 1 ? part.value.trimEnd()
			: part.value
	}))
	while (trimmed[0]?.value === "") trimmed.shift()
	while (trimmed[trimmed.length - 1]?.value === "") trimmed.pop()
	return trimmed
}

const parametersOf = (doc: JSDoc): string[] | undefined => {
	const parent = doc.getParent()
	return Node.isMethodSignature(parent) || Node.isMethodDeclaration(parent) ?
			parent.getParameters().map(param => param.getName())
		:	undefined
}

const parseBlock = (doc: JSDoc): ParsedJsDocBlock | undefined => {
	const nameAndGroup = extractNameAndGroup(doc)
	if (!nameAndGroup) return undefined

	const { name, group } = nameAndGroup

	const tags = doc.getTags()
	const rootComment = doc.getComment()

	if (!rootComment)
		return throwInternalError(`Expected root comment for ${group}/${name}`)

	const allParts: ParsedJsDocPart[] =
		typeof rootComment === "string" ?
			parseJsDocText(rootComment)
		:	rootComment.filter(_ => !!_).flatMap(parseJsDocPart)

	const { summary, notes } = organizeDocParts(allParts)
	for (const note of notes) unmarkNote(note)

	for (const tag of tags) {
		if (tag.getTagName() !== "throws") continue
		const thrown = /^@throws\s*{([^}]+)}([^*]*)/.exec(tag.getText())
		if (thrown) {
			notes.push([
				{
					kind: "noteStart",
					value: `throws \`${thrown[1]}\` ${thrown[2].trim()}`.trim(),
					warning: true
				}
			])
		}
	}

	const result: ParsedJsDocBlock = {
		group,
		name,
		summary,
		notes
	}

	const params = parametersOf(doc)
	if (params) result.params = params

	const example = tags.find(t => t.getTagName() === "example")?.getCommentText()
	if (example) result.example = example

	const experimentalTag = tags.find(t => t.getTagName() === "experimental")
	if (experimentalTag) {
		result.experimental = trimParts(
			parseJsDocText(experimentalTag.getCommentText())
		)
	}

	return result
}

/**
 * The docs show notes without the emoji that delimit them in source:
 * a ⚠️ note is labeled as a warning, and other markers are dropped.
 */
const unmarkNote = (note: ParsedJsDocPart[]) => {
	const start = note[0]
	if (start?.kind !== "noteStart") return
	const marker = noteMarkerRegex.exec(start.value)?.[0] ?? ""
	start.value = start.value.slice(marker.length)
	if (marker.startsWith("⚠️")) start.warning = true
}

/**
 * A reference to a name documented on the same page stays an in-page anchor.
 * Any other becomes a link if we know where it's documented, or else code.
 */
const resolveReference = (
	part: ParsedJsDocPart,
	pageNames: readonly string[]
): ParsedJsDocPart => {
	if (part.kind !== "reference" || pageNames.includes(part.value)) return part
	const url = referenceUrls[part.value]
	if (url) return { kind: "link", url, value: part.value }
	return { kind: "text", value: `\`${part.value}\`` }
}

const parseJsDocPart = (part: RawJsDocPart): ParsedJsDocPart[] => {
	switch (part.getKindName()) {
		case "JSDocText":
			return parseJsDocText(part.compilerNode.text)
		case "JSDocLink":
			return [parseJsDocLink(part)]
		default:
			return throwInternalError(
				`Unsupported JSDoc part kind ${part.getKindName()} at position ${part.getPos()} in ${part.getSourceFile().getFilePath()}`
			)
	}
}

const parseJsDocText = (text: string | undefined): ParsedJsDocPart[] => {
	if (!text) return []
	const sections = text.split(noteDelimiterRegex)
	// split can't break at index 0, so text after a {@link} may open with a note
	return sections.map((sectionText, i) =>
		i === 0 && !noteDelimiterRegex.test(sectionText) ?
			{ kind: "text", value: sectionText }
		:	{ kind: "noteStart", value: sectionText.trimStart() }
	)
}

const describedLinkRegex = /{@link\s+(https?:\/\/[^\s|}]+)(?:\s*\|\s*([^}]*))?}/

const parseJsDocLink = (part: RawJsDocPart): ParsedJsDocPart => {
	const linkText = part.getText()
	const match = describedLinkRegex.exec(linkText)
	if (match) {
		const url = match[1].trim()
		const value = match[2]?.trim() || url
		return { kind: "link", url, value }
	}

	const referencedName = part
		.getChildren()
		.find(
			child =>
				child.isKind(SyntaxKind.Identifier) ||
				child.isKind(SyntaxKind.QualifiedName)
		)
		?.getText()

	if (!referencedName) {
		return throwInternalError(
			`Unable to parse referenced name from ${part.getText()}`
		)
	}

	return {
		kind: "reference",
		value: referencedName
	}
}

type MatchContext = {
	matchedJsDoc: JSDoc
	updateJsDoc: (text: string) => void
	inheritDocsSource: string | undefined
}

const docgenForFile = (sourceFile: SourceFile) => {
	const path = sourceFile.getFilePath()

	const jsDocNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc)

	const matchContexts: MatchContext[] = jsDocNodes.flatMap(jsDoc => {
		const text = jsDoc.getText()

		const inheritDocsSource = extractInheritDocName(path, text)

		if (
			!inheritDocsSource &&
			!Object.keys(replacedDecorators).some(k => text.includes(k))
		)
			return []

		return {
			matchedJsDoc: jsDoc,
			inheritDocsSource,
			updateJsDoc: text => {
				const parent = jsDoc.getParent() as JSDocableNode

				// replace the original JSDoc node in the AST with a new one
				// created from updatedContents
				jsDoc.remove()
				parent.addJsDoc(text)

				updateCount++
			}
		}
	})

	for (const ctx of matchContexts) {
		const inheritedDocs = findInheritedDocs(sourceFile, ctx)

		let updatedContents = ctx.matchedJsDoc.getInnerText()

		if (inheritedDocs)
			updatedContents = `${inheritedDocs.originalSummary}\n${inheritedDocs.inheritedDescription}`

		updatedContents = Object.entries(replacedDecorators).reduce(
			(contents, [decorator, message]) => contents.replace(decorator, message),
			updatedContents
		)

		ctx.updateJsDoc(updatedContents)
	}
}

const findInheritedDocs = (
	sourceFile: SourceFile,
	{ inheritDocsSource, matchedJsDoc }: MatchContext
) => {
	if (!inheritDocsSource) return

	const sourceDeclaration = sourceFile
		.getDescendantsOfKind(SyntaxKind.Identifier)
		.find(i => i.getText() === inheritDocsSource)
		?.getDefinitions()[0]
		.getDeclarationNode()

	if (!sourceDeclaration || !canHaveJsDoc(sourceDeclaration)) return

	const matchedDescription = matchedJsDoc.getDescription()

	const inheritedDescription = sourceDeclaration.getJsDocs()[0].getDescription()

	const originalSummary = matchedDescription
		.slice(0, matchedDescription.indexOf("{"))
		.trim()

	return {
		originalSummary,
		inheritedDescription
	}
}

const extractInheritDocName = (
	path: string,
	text: string
): string | undefined => {
	const inheritDocTokenIndex = text.indexOf(inheritDocToken)

	if (inheritDocTokenIndex === -1) return

	const prefix = text.slice(0, inheritDocTokenIndex)

	const openBraceIndex = prefix.trimEnd().length - 1

	if (text[openBraceIndex] !== "{") {
		throwJsDocgenParseError(
			path,
			text,
			` Expected '{' before @inheritDoc but got '${text[openBraceIndex]}'`
		)
	}

	const openTagEndIndex = inheritDocTokenIndex + inheritDocToken.length

	const textFollowingOpenTag = text.slice(openTagEndIndex)

	const innerTagLength = textFollowingOpenTag.indexOf("}")

	if (innerTagLength === -1) {
		throwJsDocgenParseError(
			path,
			text,
			`Expected '}' after @inheritDoc but got '${textFollowingOpenTag[0]}'`
		)
	}

	const sourceName = textFollowingOpenTag.slice(0, innerTagLength).trim()

	return sourceName
}

const canHaveJsDoc = (node: Node): node is Node & JSDocableNode =>
	"addJsDoc" in node

const throwJsDocgenParseError = (
	path: string,
	commentText: string,
	message: string
): never => {
	throw new Error(
		`jsDocGen ParseError in ${path}: ${message}\nComment text: ${commentText}`
	)
}
