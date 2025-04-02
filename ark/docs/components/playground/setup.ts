import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json" with { type: "json" }
import type * as Monaco from "monaco-editor"
import { wireTmGrammars } from "monaco-editor-textmate"
import { Registry } from "monaco-textmate"
import { loadWASM } from "onigasm"
import { schemaDts } from "../bundles/schema.ts"
import { typeDts } from "../bundles/type.ts"
import { utilDts } from "../bundles/util.ts"
import { setupCompletionsProvider } from "./completions.ts"
import { setupHoverProvider } from "./hover.ts"
import { theme } from "./theme.ts"

export const defaultPlaygroundCode = `import { type } from "arktype"

export const MyType = type({
  name: "string",
  age: "number"
})

export const out = MyType({
  name: "Anders Hejlsberg",
  age: null
})
`

export const editorFileUri = "file:///main.ts"

let onigasmLoaded = false
let monacoInitialized = false
let tsLanguageServiceInstance: Monaco.languages.typescript.TypeScriptWorker | null =
	null

let onigasmPromise: Promise<void> | null = null

const initOnigasm = async () => {
	if (onigasmPromise) return onigasmPromise

	if (!onigasmLoaded) {
		try {
			onigasmPromise = loadWASM("/onigasm.wasm")
			onigasmLoaded = true
		} catch (e) {
			onigasmPromise = null
			throw e
		}

		return onigasmPromise
	}

	return Promise.resolve()
}

const configureTypeScript = (monaco: typeof Monaco): void => {
	const tsDefaultModeConfig = (
		monaco.languages.typescript.typescriptDefaults as any
	)._modeConfiguration
	tsDefaultModeConfig.hovers = false
	tsDefaultModeConfig.completionItems = false

	monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
		strict: true,
		exactOptionalPropertyTypes: true,
		target: monaco.languages.typescript.ScriptTarget.ESNext,
		moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
		allowNonTsExtensions: true
	})

	monaco.languages.typescript.typescriptDefaults.addExtraLib(utilDts)
	monaco.languages.typescript.typescriptDefaults.addExtraLib(schemaDts)
	monaco.languages.typescript.typescriptDefaults.addExtraLib(typeDts)
}

const getInitializedTypeScriptService = async (
	monaco: typeof Monaco,
	targetUri = monaco.Uri.parse(editorFileUri)
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	configureTypeScript(monaco)

	if (!monaco.editor.getModel(targetUri))
		monaco.editor.createModel(defaultPlaygroundCode, "typescript", targetUri)

	const worker = await monaco.languages.typescript.getTypeScriptWorker()
	return await worker(targetUri)
}

const setupTextmateGrammar = async (monaco: typeof Monaco) =>
	await wireTmGrammars(
		monaco,
		new Registry({
			getGrammarDefinition: async () => ({
				format: "json",
				content: arktypeTextmate
			})
		}),
		new Map().set("typescript", "source.ts")
	)

export const setupMonaco = async (
	monaco: typeof Monaco
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	if (!monacoInitialized) {
		try {
			await initOnigasm()
		} catch (e) {
			// this often happens during dev, ignore it
			if (!String(e).includes("subsequent calls are not allowed"))
				console.error(e)
		}

		monaco.editor.defineTheme("arkdark", theme)

		if (!tsLanguageServiceInstance) {
			const tsLanguageService = await getInitializedTypeScriptService(monaco)
			setupHoverProvider(monaco, tsLanguageService)
			setupCompletionsProvider(monaco, tsLanguageService)
			await setupTextmateGrammar(monaco)

			tsLanguageServiceInstance = tsLanguageService
			monacoInitialized = true
		}
	}

	return tsLanguageServiceInstance!
}
