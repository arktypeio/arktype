import { readFile, tsFileMatcher } from "@arktype/fs"
import type { Project } from "ts-morph"
import type { DocGenSnippetsConfig } from "../docgen.js"
import {
	extractionTokens,
	includesTokenFrom,
	snipTokens,
	type ExtractionToken
} from "./snipTokens.js"
import { transformTsFileContents } from "./transformTsFileText.js"

/** Represents paths mapped to snippet data for a file */
export type SnippetsByPath = Record<string, SnippetsByLabel>

export type Snippet = {
	text: string
}

export type SnippetTransformToggles = {
	imports: boolean
}

export type ExtractSnippetsArgs = {
	project: Project
}

export const extractSnippets = (
	sourcePaths: string[],
	project: Project,
	config: DocGenSnippetsConfig
): SnippetsByPath => {
	const snippetsByPath: SnippetsByPath = {}
	for (const path of sourcePaths) {
		const fileText = tsFileMatcher.test(path)
			? transformTsFileContents(path, project, config)
			: readFile(path)
		snippetsByPath[path] = extractSnippetsFromFile(path, fileText)
	}
	return snippetsByPath
}

const extractSnippetsFromFile = (
	path: string,
	sourceFileText: string
): SnippetsByLabel => {
	const byLabel = extractLabeledSnippets(path, sourceFileText)
	const text = linesToOutput(sourceFileText.split("\n"))
	return {
		all: {
			text
		},
		...byLabel
	}
}

export type SnippetsByLabel = Record<string, Snippet>

const extractLabeledSnippets = (
	filePath: string,
	sourceText: string
): SnippetsByLabel => {
	const labeledSnippets: Record<string, Snippet> = {}
	const openBlocks: SnipStart[] = []

	const lines = sourceText.split("\n")
	for (const [i, lineText] of lines.entries()) {
		const lineNumber = i + 1
		if (includesTokenFrom(lineText, extractionTokens)) {
			const parsedSnip = parseSnipComment(lineText, filePath, lineNumber)
			if (parsedSnip.kind === extractionTokens["@snipStart"]) {
				openBlocks.push({ ...parsedSnip, lineNumber })
			} else if (parsedSnip.kind === extractionTokens["@snipEnd"]) {
				const lastOpenBlock = openBlocks.pop()
				if (!lastOpenBlock) {
					throw new Error(
						`At ${filePath}:${lineNumber}, ${extractionTokens["@snipEnd"]} has no matching ${extractionTokens["@snipStart"]}`
					)
				}
				labeledSnippets[lastOpenBlock.id] = {
					text: linesToOutput(lines.slice(lastOpenBlock.lineNumber, lineNumber))
				}
			} else {
				labeledSnippets[parsedSnip.id] = {
					text: linesToOutput(lines.slice(lineNumber, lineNumber + 1))
				}
			}
		}
	}
	if (openBlocks.length) {
		throw new Error(buildOpenBlocksErrorMessage(openBlocks, filePath))
	}
	return labeledSnippets
}

const buildOpenBlocksErrorMessage = (openBlocks: SnipStart[], path: string) =>
	`At ${path}, no ${
		extractionTokens["@snipEnd"]
	} comments were found corresponding to the following ${
		extractionTokens["@snipStart"]
	} ids: ${openBlocks.map((block) => block.id).join(",")}.`

const linesToOutput = (lines: string[]) =>
	lines.filter((line) => outputShouldInclude(line)).join("\n")

type SnipEnd = {
	kind: "@snipEnd"
}

type SnipLine = {
	kind: "@snipLine"
	id: string
}

type SnipStart = {
	kind: "@snipStart"
	id: string
	lineNumber: number
}

type ParsedSnip = SnipStart | SnipLine | SnipEnd

const parseSnipComment = (
	snipComment: string,
	filePath: string,
	lineNumber: number
): ParsedSnip => {
	const snipText = snipComment
		.slice(snipComment.indexOf("@snip"))
		.replaceAll("\r", "")
	const parts = snipText.split(" ")
	const [kind, id] = parts[0].split(":") as [
		ExtractionToken,
		string | undefined
	]
	if (kind === extractionTokens["@snipEnd"]) {
		return { kind }
	}
	if (!id) {
		throw new Error(
			`At ${filePath}:${lineNumber}, snip comment '${snipText}' requires a label like '${extractionTokens["@snipStatement"]}:mySnipLabel'.`
		)
	}
	if (kind === extractionTokens["@snipLine"]) {
		return {
			id,
			kind
		}
	}
	if (kind === extractionTokens["@snipStart"]) {
		return {
			id,
			kind,
			lineNumber
		}
	}
	throw new Error(`Unrecognized snip '${kind}' at ${filePath}:${lineNumber}`)
}

const outputShouldInclude = (line: string) => {
	return !includesTokenFrom(line, snipTokens)
}
