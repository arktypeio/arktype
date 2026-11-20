import type * as Monaco from "monaco-editor"
import { regexDts } from "../dts/regex.ts"
import { schemaDts } from "../dts/schema.ts"
import { typeDts } from "../dts/type.ts"
import { utilDts } from "../dts/util.ts"

const configureTypeScript = (monaco: typeof Monaco): void => {
	const tsDefaultModeConfig = (monaco.typescript.typescriptDefaults as any)
		._modeConfiguration
	tsDefaultModeConfig.hovers = false
	tsDefaultModeConfig.completionItems = false

	monaco.typescript.typescriptDefaults.setCompilerOptions({
		strict: true,
		exactOptionalPropertyTypes: true,
		target: monaco.typescript.ScriptTarget.ESNext,
		moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
		allowNonTsExtensions: true
	})

	monaco.typescript.typescriptDefaults.addExtraLib(utilDts)
	monaco.typescript.typescriptDefaults.addExtraLib(schemaDts)
	monaco.typescript.typescriptDefaults.addExtraLib(typeDts)
	monaco.typescript.typescriptDefaults.addExtraLib(regexDts)
}

export const getInitializedTypeScriptService = async (
	monaco: typeof Monaco,
	editorFileUri: string,
	contents: string
): Promise<Monaco.typescript.TypeScriptWorker> => {
	const targetUri = monaco.Uri.parse(editorFileUri)
	configureTypeScript(monaco)

	if (!monaco.editor.getModel(targetUri))
		monaco.editor.createModel(contents, "typescript", targetUri)

	const worker = await monaco.typescript.getTypeScriptWorker()
	return await worker(targetUri)
}
