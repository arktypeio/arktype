import type * as Monaco from "monaco-editor"
import type { CompletionInfo, ScriptElementKind } from "typescript"
import { createPositionHash, isDuplicateRequest } from "./utils.ts"

export const getCompletions = async (
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker,
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
) => {
	const uri = model.uri.toString()
	const offset = model.getOffsetAt(position)
	return await tsLanguageService.getCompletionsAtPosition(uri, offset)
}

export const setupCompletionProvider = (
	monaco: typeof Monaco,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
) =>
	monaco.languages.registerCompletionItemProvider("typescript", {
		triggerCharacters: [".", '"', "'", "`", "/", "@", "<", "#", " "],
		provideCompletionItems: async (model, position) => {
			const positionHash = createPositionHash(model, position)
			if (isDuplicateRequest(positionHash)) return { suggestions: [] }

			const completions = await getCompletions(
				tsLanguageService,
				model,
				position
			)
			if (!completions) return { suggestions: [] }

			return formatCompletions(completions, model, position)
		}
	})

const formatCompletions = (
	completions: CompletionInfo,
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
) => {
	const suggestions = completions.entries.map(entry => {
		const start =
			entry.replacementSpan ?
				model.getPositionAt(entry.replacementSpan.start)
			:	position

		const end =
			entry.replacementSpan ?
				model.getPositionAt(
					entry.replacementSpan.start + entry.replacementSpan.length
				)
			:	position

		const range = {
			startLineNumber: start.lineNumber,
			startColumn: start.column,
			endLineNumber: end.lineNumber,
			endColumn: end.column
		}

		return {
			label: entry.name,
			kind: tsToMonacoCompletionKinds[entry.kind],
			insertText: entry.name,
			range,
			sortText: entry.sortText,
			detail: entry.kind
		}
	})

	return { suggestions }
}

// Mirror Monaco.languages.CompletionItemKind
// since importing Monaco directly at runtime causes issues
const MonacoCompletionKind = {
	Method: 0,
	Function: 1,
	Constructor: 2,
	Field: 3,
	Variable: 4,
	Class: 5,
	Struct: 6,
	Interface: 7,
	Module: 8,
	Property: 9,
	Event: 10,
	Operator: 11,
	Unit: 12,
	Value: 13,
	Constant: 14,
	Enum: 15,
	EnumMember: 16,
	Keyword: 17,
	Text: 18,
	Color: 19,
	File: 20,
	Reference: 21,
	Customcolor: 22,
	Folder: 23,
	TypeParameter: 24,
	User: 25,
	Issue: 26,
	Snippet: 27
} as const

const tsToMonacoCompletionKinds: Record<
	ScriptElementKind,
	Monaco.languages.CompletionItemKind
> = {
	"": MonacoCompletionKind.Text,

	// Variable declarations
	const: MonacoCompletionKind.Constant,
	let: MonacoCompletionKind.Variable,
	var: MonacoCompletionKind.Variable,
	"local var": MonacoCompletionKind.Variable,

	// Functions and methods
	function: MonacoCompletionKind.Function,
	"local function": MonacoCompletionKind.Function,
	"local class": MonacoCompletionKind.Class,
	method: MonacoCompletionKind.Method,
	getter: MonacoCompletionKind.Method,
	setter: MonacoCompletionKind.Method,
	constructor: MonacoCompletionKind.Constructor,

	// Types, interfaces, and classes
	class: MonacoCompletionKind.Class,
	interface: MonacoCompletionKind.Interface,
	enum: MonacoCompletionKind.Enum,
	type: MonacoCompletionKind.Reference,
	"enum member": MonacoCompletionKind.EnumMember,
	"primitive type": MonacoCompletionKind.Value,
	"type parameter": MonacoCompletionKind.TypeParameter,
	alias: MonacoCompletionKind.Reference,

	// Properties and parameters
	property: MonacoCompletionKind.Property,
	parameter: MonacoCompletionKind.Variable,

	// Modules, scripts, and file system
	module: MonacoCompletionKind.Module,
	script: MonacoCompletionKind.File,
	directory: MonacoCompletionKind.Folder,

	// Special types
	keyword: MonacoCompletionKind.Keyword,
	call: MonacoCompletionKind.Function,
	index: MonacoCompletionKind.Value,
	construct: MonacoCompletionKind.Constructor,
	"JSX attribute": MonacoCompletionKind.Property,
	string: MonacoCompletionKind.Constant,
	link: MonacoCompletionKind.Reference,
	"link name": MonacoCompletionKind.Text,
	"link text": MonacoCompletionKind.Text,
	label: MonacoCompletionKind.Text,
	warning: MonacoCompletionKind.Issue,
	using: MonacoCompletionKind.Keyword,
	"await using": MonacoCompletionKind.Keyword,
	accessor: MonacoCompletionKind.Keyword,
	"external module name": MonacoCompletionKind.Module
}
