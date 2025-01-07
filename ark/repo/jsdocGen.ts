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
const { writeFile } = bootstrapFs

const inheritDocToken = "@inheritDoc"
const typeOnlyToken = "@typeonly"
const typeOnlyMessage =
	"🥸 Inference-only property that will be `undefined` at runtime"
const typeNoopToken = "@typenoop"
const typeNoopMessage = "🥸 Inference-only function that does nothing runtime"

const arkTypeBuildDir = join(repoDirs.arkDir, "type", "out")
const jsdocSourcesGlob = `${arkTypeBuildDir}/**/*.d.ts`

let updateCount = 0

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

const apiGroups = ["Type"] as const

export type ApiGroup = (typeof apiGroups)[number]

export type JsdocComment = ReturnType<JSDoc["getComment"]>

export type JsdocPart = Extract<JsdocComment, readonly unknown[]>[number] & {}

export type ParsedJsdocPart =
	| { kind: "text"; text: string }
	| { kind: "reference"; to: string }
	| { kind: "link"; text: string; url: string }

export const buildApi = () => {
	const project = createProject()
	jsdocGen(project)
	const docs = getAllJsDoc(project)

	const apiDocsByGroup = flatMorph(docs, (i, doc) => {
		const block = parseBlock(doc)

		if (!block) return []

		return [{ group: block.group }, block]
	})

	writeFile(
		join(repoDirs.docs, "components", "apiData.ts"),
		`export const apiDocsByGroup = ${JSON.stringify(apiDocsByGroup, null, 4)}`
	)
}

type ParsedBlock = {
	group: ApiGroup
	name: string
	parts: ParsedJsdocPart[]
}

const parseBlock = (doc: JSDoc): ParsedBlock | undefined => {
	const name = doc.getNextSiblingIfKind(SyntaxKind.Identifier)?.getText()

	if (!name) return

	const group = doc
		.getTags()
		.find(t => t.getTagName() === "api")
		?.getCommentText()

	if (!group) return

	if (!includes(apiGroups, group)) {
		return throwInternalError(
			`Invalid API group ${group} for name ${name}. Should be defined like @api Type`
		)
	}

	const rawParts = doc.getComment()

	if (!rawParts) return

	let parts: ParsedJsdocPart[]

	if (typeof rawParts === "string") parts = [{ kind: "text", text: rawParts }]
	// remove any undefined parts before parsing
	else parts = rawParts.filter(part => !!part).map(parseJsdocPart)

	return {
		group,
		name,
		parts
	}
}

const parseJsdocPart = (part: JsdocPart): ParsedJsdocPart => {
	switch (part.getKindName()) {
		case "JSDocText":
			return {
				kind: "text",
				// using part.getText() here seems to include comment syntax
				text: part.compilerNode.text
			}
		case "JSDocLink":
			return {
				kind: "reference",
				to: part.getFirstChildByKindOrThrow(SyntaxKind.Identifier).getText()
			}
		default:
			return throwInternalError(
				`Unsupported JSDoc part kind ${part.getKindName()} at position ${part.getPos()} in ${part.getSourceFile().getFilePath()}`
			)
	}
}

export const getAllJsDoc = (project: Project) => {
	const sourceFiles = project.getSourceFiles()

	return sourceFiles.flatMap(file =>
		file.getDescendantsOfKind(SyntaxKind.JSDoc)
	)
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
