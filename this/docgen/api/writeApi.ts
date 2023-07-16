import { appendFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { ensureDir } from "../../../attest/src/fs.js"
import { shell } from "../../../attest/src/shell.js"
import type { DocGenApiConfig } from "../main.js"
import { keywordTable } from "./buildTable/keywords.js"
import { getFormats } from "./buildTable/operators.js"
import { constructRow } from "./buildTable/table.js"
import type {
	ApiEntryPoint,
	ExportData,
	PackageExtractionData
} from "./extractApi.js"
import { generateKeywordMasterList, operatorsTable } from "./postProcess.js"
import type { TsTagData } from "./tsDocTransforms.js"
import {
	formatTagData,
	packTsDocTags,
	transformLinkTagToURL
} from "./tsDocTransforms.js"

export const writeApi = (
	apiConfig: DocGenApiConfig,
	extractedData: PackageExtractionData
) => {
	rmSync(apiConfig.outDir, { recursive: true, force: true })
	for (const entryPoint of extractedData.api) {
		const entryNames = entryPoint.exports.map((entry) => entry.name)
		const entryPointOutDir =
			entryPoint.subpath === "."
				? apiConfig.outDir
				: join(apiConfig.outDir, entryPoint.subpath)
		ensureDir(entryPointOutDir)
		writeEntryPoint(entryPoint, entryPointOutDir, entryNames)
	}
	shell(`prettier --write ${apiConfig.outDir}`)
}

const writeEntryPoint = (
	entryPoint: ApiEntryPoint,
	entryPointOutDir: string,
	entryNames: string[]
) => {
	for (const exported of entryPoint.exports) {
		const mdFilePath = join(
			entryPointOutDir,
			`${exported.name.toLowerCase()}.md`
		)
		transformLinkTagToURL(mdFilePath, exported, entryNames)
		const data = packTsDocTags(exported.tsDocs ?? [])
		// items with same name write to same file for now (e.g. type/Type) to
		// avoid a docusaurus build failure
		appendFileSync(mdFilePath, generateMarkdownForExport(exported, data))
	}
	postProcessMarkdownSpawners(entryPointOutDir)
}

export type ScopeData = { [k: string]: string }
const scopeData: ScopeData[] = []
const operatingTable: string[] = []

const postProcessMarkdownSpawners = (entryPointOutDir: string) => {
	generateKeywordMasterList(join(entryPointOutDir, "keywords.md"), scopeData)
	operatorsTable(join(entryPointOutDir, "operators.md"), operatingTable)
}

const generateMarkdownForExport = (
	exported: ExportData,
	tagData: TsTagData
) => {
	const tagsToIgnore = /docgen\w+/
	const md = new MarkdownSection(exported.name)
	md.options({ hide_table_of_contents: true })
	for (const [tag, arrayOfTagData] of Object.entries(tagData)) {
		if (tagsToIgnore.test(tag)) {
			continue
		}
		md.section(tag).text(formatTagData(arrayOfTagData, tag))
	}
	if (tagData.docgenTable) {
		if (tagData.operator) {
			const row = [tagData.operator[0], ...getFormats(tagData)]
			operatingTable.push(constructRow(row))
		}
		if (tagData.docgenScope) {
			const table = keywordTable(exported.text, tagData)
			const text = table.join("\n")
			md.section("text").text(text)
			scopeData.push({ name: exported.name, text })
		}
	} else {
		md.section("text").tsBlock(exported.text)
	}

	return md.toString()
}

export class MarkdownSection {
	private contents: (string | MarkdownSection)[]
	private optionsAdded = false
	constructor(
		header: string,
		private depth = 1
	) {
		this.contents = [`${"#".repeat(depth)} ${header}\n`]
	}

	options(options: {}) {
		if (!this.optionsAdded) {
			const optionLines = ["---"]
			for (const [k, v] of Object.entries(options)) {
				optionLines.push(`${k}: ${v}`)
			}
			optionLines.push("---\n")
			this.contents.unshift(optionLines.join("\n"))
		}
		this.optionsAdded = true
	}
	section(header: string) {
		const section = new MarkdownSection(header, this.depth + 1)
		this.contents.push(section)
		return section
	}

	tsBlock(content: string) {
		return this.codeBlock(content, "ts")
	}

	codeBlock(content: string, language: string) {
		this.contents.push("```" + language + "\n" + content + "\n```\n")
		return this
	}

	text(content: string) {
		this.contents.push(`${content}\n`)
		return this
	}

	toString(): string {
		return this.contents.reduce(
			(result: string, section) => result + section.toString(),
			""
		)
	}
}
