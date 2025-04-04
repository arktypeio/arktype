import type * as Monaco from "monaco-editor"
import { schemaDts } from "../dts/schema.ts"
import { typeDts } from "../dts/type.ts"
import { utilDts } from "../dts/util.ts"

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

export const getInitializedTypeScriptService = async (
	monaco: typeof Monaco,
	editorFileUri: string,
	contents: string
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	const targetUri = monaco.Uri.parse(editorFileUri)
	configureTypeScript(monaco)

	if (!monaco.editor.getModel(targetUri))
		monaco.editor.createModel(contents, "typescript", targetUri)

	const worker = await monaco.languages.typescript.getTypeScriptWorker()
	return await worker(targetUri)
}
