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

const { flatMorph, includes, throwInternalError } = bootstrapUtil
const { writeFile, shell } = bootstrapFs

const inheritDocToken = "@inheritDoc"
const typeOnlyToken = "@typeonly"
const typeOnlyMessage =
	"- 🥸 Inference-only property that will be `undefined` at runtime"
const typeNoopToken = "@typenoop"
const typeNoopMessage = "- 🥸 Inference-only function that does nothing runtime"

const arkTypeBuildDir = join(repoDirs.arkDir, "type", "out")
const jsdocSourcesGlob = `${arkTypeBuildDir}/**/*.d.ts`

let updateCount = 0

export const buildApi = () => {
	const project = createProject()
	jsdocGen(project)
	const docs = getAllJsDoc(project)

	const apiDocsByGroup = flatMorph(docs, (i, doc) => {
		const block = parseBlock(doc)

		if (!block) return []

		return [{ group: block.group }, block]
	})

	const apiDataPath = join(repoDirs.docs, "components", "apiData.ts")

	writeFile(
		apiDataPath,
		`import type { ApiDocsByGroup } from "../../repo/jsdocGen.ts"

export const apiDocsByGroup: ApiDocsByGroup = ${JSON.stringify(apiDocsByGroup, null, 4)}`
	)

	shell(`prettier --write ${apiDataPath}`)
}

export const jsdocGen = (project: Project) => {
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

const apiGroups = ["Type"] as const

export type ApiGroup = (typeof apiGroups)[number]

export type JsdocComment = ReturnType<JSDoc["getComment"]>

export type JsdocPart = Extract<JsdocComment, readonly unknown[]>[number] & {}

export type ParsedJsDocPart = ShallowJsDocPart | ParsedJsDocTag

export type ShallowJsDocPart =
	| { kind: "text"; value: string }
	| { kind: "noteStart"; value: string }
	| { kind: "reference"; value: string }
	| { kind: "link"; value: string; url: string }

export type ParsedJsDocTag = {
	kind: "tag"
	name: string
	value: ParsedJsDocPart[]
}

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
			`jsdocGen rewrites ${arkTypeBuildDir} but that directory doesn't exist. Did you run "pnpm build" there first?`
		)
	}

	project.addSourceFilesAtPaths(jsdocSourcesGlob)

	return project
}

const parseBlock = (doc: JSDoc): ParsedJsDocBlock | undefined => {
	const name = doc.getNextSiblingIfKind(SyntaxKind.Identifier)?.getText()

	if (!name) return

	const tags = doc.getTags()
	const group = tags.find(t => t.getTagName() === "api")?.getCommentText()

	if (!group) return

	if (!includes(apiGroups, group)) {
		return throwInternalError(
			`Invalid API group ${group} for name ${name}. Should be defined like @api Type`
		)
	}

	const rootComment = doc.getComment()

	if (!rootComment)
		return throwInternalError(`Expected root comment for ${group}/${name}`)

	const allParts: ParsedJsDocPart[] =
		typeof rootComment === "string" ?
			parseJsdocText(rootComment)
			// remove any undefined parts before parsing
		:	rootComment.filter(part => !!part).flatMap(parseJsdocPart)

	const summaryParts: ParsedJsDocPart[] = []
	const notePartGroups: ParsedJsDocPart[][] = []

	allParts.forEach(part => {
		if (part.kind === "noteStart") notePartGroups.push([part])
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

const parseJsdocPart = (part: JsdocPart): ParsedJsDocPart[] => {
	switch (part.getKindName()) {
		case "JSDocText":
			return parseJsdocText(part.compilerNode.text)
		case "JSDocLink":
			return [parseJsdocLink(part)]
		default:
			return throwInternalError(
				`Unsupported JSDoc part kind ${part.getKindName()} at position ${part.getPos()} in ${part.getSourceFile().getFilePath()}`
			)
	}
}

const parseJsdocText = (text: string): ParsedJsDocPart[] => {
	const sections = text.split(/\n\s*-/)
	return sections.map((sectionText, i) => ({
		kind: i === 0 ? "text" : "noteStart",
		value: sectionText.trim()
	}))
}

const describedLinkRegex =
	/\{@link\s+(https?:\/\/[^\s|}]+)(?:\s*\|\s*([^}]*))?\}/

const parseJsdocLink = (part: JsdocPart): ParsedJsDocPart => {
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
	matchedJsdoc: JSDoc
	updateJsdoc: (text: string) => void
	inheritDocsSource: string | undefined
}

const docgenForFile = (sourceFile: SourceFile) => {
	const path = sourceFile.getFilePath()

	const jsdocNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc)

	const matchContexts: MatchContext[] = jsdocNodes.flatMap(jsdoc => {
		const text = jsdoc.getText()

		const inheritDocsSource = extractInheritDocName(path, text)

		if (
			!inheritDocsSource &&
			!text.includes(typeOnlyToken) &&
			!text.includes(typeNoopToken)
		)
			return []

		return {
			matchedJsdoc: jsdoc,
			inheritDocsSource,
			updateJsdoc: text => {
				const parent = jsdoc.getParent() as JSDocableNode

				// replace the original JSDoc node in the AST with a new one
				// created from updatedContents
				jsdoc.remove()
				parent.addJsDoc(text)

				updateCount++
			}
		}
	})

	matchContexts.forEach(ctx => {
		const inheritedDocs = findInheritedDocs(sourceFile, ctx)

		let updatedContents = ctx.matchedJsdoc.getInnerText()

		if (inheritedDocs)
			updatedContents = `${inheritedDocs.originalSummary}\n${inheritedDocs.inheritedDescription}`

		updatedContents = updatedContents.replace(typeOnlyToken, typeOnlyMessage)
		updatedContents = updatedContents.replace(typeNoopToken, typeNoopMessage)

		ctx.updateJsdoc(updatedContents)
	})
}

const findInheritedDocs = (
	sourceFile: SourceFile,
	{ inheritDocsSource, matchedJsdoc }: MatchContext
) => {
	if (!inheritDocsSource) return

	const sourceDeclaration = sourceFile
		.getDescendantsOfKind(ts.SyntaxKind.Identifier)
		.find(i => i.getText() === inheritDocsSource)
		?.getDefinitions()[0]
		.getDeclarationNode()

	if (!sourceDeclaration || !canHaveJsDoc(sourceDeclaration)) return

	const matchedDescription = matchedJsdoc.getDescription()

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
		`jsdocGen ParseError in ${path}: ${message}\nComment text: ${commentText}`
	)
}
