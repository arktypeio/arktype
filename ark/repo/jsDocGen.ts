import { existsSync } from "fs"
import { join } from "path"
import {
	Project,
	SyntaxKind,
	type JSDoc,
	type JSDocableNode,
	type Node,
	type SourceFile
} from "ts-morph"
import ts from "typescript"
import { bootstrapFs, bootstrapUtil, repoDirs } from "./shared.ts"

const { flatMorph, throwInternalError, emojiToUnicode } = bootstrapUtil
const { writeFile, shell } = bootstrapFs

const inheritDocToken = "@inheritDoc"

// used to delimit notes in JSDoc.
// add to the list if you need new ones!
const noteEmoji = ["✅", "🥸", "⚠️", "🔗"]

const noteEmojiUnicode = noteEmoji.map(emojiToUnicode)
const noteDelimiterRegex = new RegExp(`(?=\\n\\s*[-${noteEmojiUnicode}])`, "u")

const replacedDecorators = {
	"@typeonly": "🥸 inference-only property that will be `undefined` at runtime",
	"@typenoop": "🥸 inference-only function that does nothing runtime",
	"@chainedDefinition":
		"⚠️ unlike most other methods, this creates a definition rather than a Type (read why)",
	"@predicateCast":
		"🥸 {@link https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates | Type predicates} can be used to cast"
} as const

const arkTypeBuildDir = join(repoDirs.arkDir, "type", "out")
const jsDocSourcesGlob = `${arkTypeBuildDir}/**/*.d.ts`

let updateCount = 0

export const buildApi = () => {
	const project = createProject()
	jsDocGen(project)
	const docs = getAllJsDoc(project)

	const apiDocsByGroup = flatMorph(docs, (i, doc) => {
		const block = parseBlock(doc)

		if (!block) return []

		return [{ group: block.group }, block]
	})

	const apiDataPath = join(repoDirs.docs, "components", "apiData.ts")

	writeFile(
		apiDataPath,
		`import type { ApiDocsByGroup } from "../../repo/jsDocGen.ts"

export const apiDocsByGroup: ApiDocsByGroup = ${JSON.stringify(apiDocsByGroup, null, 4)}`
	)

	shell(`prettier --write ${apiDataPath}`)
}

export const jsDocGen = (project: Project) => {
	const sourceFiles = project.getSourceFiles()

	console.log(
		`✍️ Generating JSDoc for ${sourceFiles.length} files in ${arkTypeBuildDir}...`
	)

	project.getSourceFiles().forEach(docgenForFile)

	project.saveSync()

	console.log(
		`📚 Successfully updated ${updateCount} JSDoc comments on your build output.`
	)
}

export const getAllJsDoc = (project: Project) => {
	const sourceFiles = project.getSourceFiles()

	return sourceFiles.flatMap(file =>
		file.getDescendantsOfKind(SyntaxKind.JSDoc)
	)
}

export type ApiGroup = "Type"

export type JsDocComment = ReturnType<JSDoc["getComment"]>

export type RawJsDocPart = Extract<
	JsDocComment,
	readonly unknown[]
>[number] & {}

export type ParsedJsDocPart =
	| { kind: "text"; value: string }
	| { kind: "noteStart"; value: string }
	| { kind: "reference"; value: string }
	| { kind: "link"; value: string; url: string }

export type ApiDocsByGroup = {
	readonly [k in ApiGroup]: readonly ParsedJsDocBlock[]
}

export type ParsedJsDocBlock = {
	group: ApiGroup
	name: string
	summary: ParsedJsDocPart[]
	notes: ParsedJsDocPart[][]
	example?: string
}

const createProject = () => {
	const project = new Project()

	if (!existsSync(arkTypeBuildDir)) {
		throw new Error(
			`jsDocGen rewrites ${arkTypeBuildDir} but that directory doesn't exist. Did you run "pnpm build" there first?`
		)
	}

	project.addSourceFilesAtPaths(jsDocSourcesGlob)

	return project
}

const parseBlock = (doc: JSDoc): ParsedJsDocBlock | undefined => {
	const name = doc.getNextSiblingIfKind(SyntaxKind.Identifier)?.getText()

	if (!name) return

	const filePath = doc.getSourceFile().getFilePath()
	let group: ApiGroup
	if (filePath.includes("methods")) group = "Type"
	else return

	if (!doc.getInnerText().trim().startsWith("#")) return

	const tags = doc.getTags()

	const rootComment = doc.getComment()

	if (!rootComment)
		return throwInternalError(`Expected root comment for ${group}/${name}`)

	const allParts: ParsedJsDocPart[] =
		typeof rootComment === "string" ?
			parseJsDocText(rootComment)
			// remove any undefined parts before parsing
		:	rootComment.filter(part => !!part).flatMap(parseJsDocPart)

	const summaryParts: ParsedJsDocPart[] = []
	const notePartGroups: ParsedJsDocPart[][] = []

	if (allParts[0].kind === "text") {
		allParts[0].value = allParts[0].value.replace(/^#+\s*/, "")
		if (allParts[0].value === "") allParts.shift()
	}

	allParts.forEach(part => {
		if (part.kind === "noteStart") notePartGroups.push(part.value ? [part] : [])
		else if (part.value === "") return
		else if (notePartGroups.length) notePartGroups.at(-1)!.push(part)
		else summaryParts.push(part)
	})

	const result: ParsedJsDocBlock = {
		group,
		name,
		summary: summaryParts,
		notes: notePartGroups
	}

	const example = tags.find(t => t.getTagName() === "example")?.getCommentText()
	if (example) result.example = example

	return result
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

const parseJsDocText = (text: string): ParsedJsDocPart[] => {
	const sections = text.split(noteDelimiterRegex)
	return sections.map((sectionText, i) => ({
		kind: i === 0 ? "text" : "noteStart",
		value: sectionText.trim()
	}))
}

const describedLinkRegex =
	/\{@link\s+(https?:\/\/[^\s|}]+)(?:\s*\|\s*([^}]*))?\}/

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

	matchContexts.forEach(ctx => {
		const inheritedDocs = findInheritedDocs(sourceFile, ctx)

		let updatedContents = ctx.matchedJsDoc.getInnerText()

		if (inheritedDocs)
			updatedContents = `${inheritedDocs.originalSummary}\n${inheritedDocs.inheritedDescription}`

		updatedContents = Object.entries(replacedDecorators).reduce(
			(contents, [decorator, message]) => contents.replace(decorator, message),
			updatedContents
		)

		ctx.updateJsDoc(updatedContents)
	})
}

const findInheritedDocs = (
	sourceFile: SourceFile,
	{ inheritDocsSource, matchedJsDoc }: MatchContext
) => {
	if (!inheritDocsSource) return

	const sourceDeclaration = sourceFile
		.getDescendantsOfKind(ts.SyntaxKind.Identifier)
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
