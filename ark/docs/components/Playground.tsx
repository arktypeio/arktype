"use client"

import Editor, { useMonaco } from "@monaco-editor/react"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import arkdarkColors from "arkthemes/arkdark.json"
import type * as Monaco from "monaco-editor"
import { wireTmGrammars } from "monaco-editor-textmate"
import { Registry } from "monaco-textmate"
import { loadWASM } from "onigasm"
import { useState } from "react"
import type { CompletionInfo } from "typescript"
import { schemaDts } from "./dts/schema.ts"
import { typeDts } from "./dts/type.ts"
import { utilDts } from "./dts/util.ts"

// Types
interface IVSCodeTheme {
	colors: {
		[name: string]: string
	}
	tokenColors: ITokenColor[]
}

interface ITokenColor {
	scope: string | string[]
	settings: {
		foreground?: string
		background?: string
		fontStyle?: string
	}
}

type DisplayPart = {
	text: string
}

type RequestMap = Map<string, number>;

// Constants
const DUPLICATE_THRESHOLD_MS = 50;
const DEFAULT_CODE = `import { type } from "arktype"

const myType = type({
	name: "string",
	age: "number"
})
`;
const EDITOR_URI = "file:///main.ts";

// Request deduplication maps
const recentCompletionRequests: RequestMap = new Map();
const recentHoverRequests: RequestMap = new Map();

/**
 * Check if a request is a duplicate and track it
 */
const deduplicateRequest = (
	requestMap: RequestMap,
	key: string
): boolean => {
	const now = Date.now();
	
	// Check if this is a duplicate request
	if (requestMap.has(key)) {
		const lastRequestTime = requestMap.get(key)!;
		if (now - lastRequestTime < DUPLICATE_THRESHOLD_MS) {
			return true; // Is a duplicate
		}
	}
	
	// Record this request
	requestMap.set(key, now);
	
	// Clean up old requests
	if (requestMap.size > 100) {
		const oldThreshold = now - 5000; // 5 seconds
		for (const [key, timestamp] of requestMap.entries()) {
			if (timestamp < oldThreshold) requestMap.delete(key);
		}
	}
	
	return false; // Not a duplicate
};

/**
 * Converts VS Code theme to Monaco theme format
 */
const translateVSCodeTheme = (
	theme: IVSCodeTheme
): Monaco.editor.IStandaloneThemeData => {
	theme.colors["editor.background"] = "#f5cf8f0a"
	return {
		base: "vs-dark",
		inherit: false,
		colors: theme.colors,
		rules: theme.tokenColors.flatMap(c => {
			if (Array.isArray(c.scope)) {
				return c.scope.map(
					sub =>
						({
							token: sub,
							background: c.settings.background,
							foreground: c.settings.foreground,
							fontStyle: c.settings.fontStyle
						}) as Monaco.editor.ITokenThemeRule
				)
			}
			return {
				token: c.scope,
				background: c.settings.background,
				foreground: c.settings.foreground,
				fontStyle: c.settings.fontStyle
			} as Monaco.editor.ITokenThemeRule
		})
	}
};

const theme = translateVSCodeTheme(arkdarkColors);

// Mirror Monaco.languages.CompletionItemKind
// since importing Monaco directly at runtime causes issues
const MonacoCompletionItemKind = {
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
} as const;

/**
 * Configure TypeScript compiler options
 */
const configureTypeScript = (monaco: typeof Monaco): void => {
	// Disable built-in hovers
	(monaco.languages.typescript.typescriptDefaults as any)._modeConfiguration.hovers = false;
	
	// Set compiler options
	monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
		strict: true,
		exactOptionalPropertyTypes: true,
		target: monaco.languages.typescript.ScriptTarget.ESNext,
		moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
		allowNonTsExtensions: true
	});
	
	// Add type definitions
	monaco.languages.typescript.typescriptDefaults.addExtraLib(utilDts);
	monaco.languages.typescript.typescriptDefaults.addExtraLib(schemaDts);
	monaco.languages.typescript.typescriptDefaults.addExtraLib(typeDts);
};

/**
 * Ensures the editor model exists
 */
const ensureModelExists = (
	monaco: typeof Monaco, 
	uri: Monaco.Uri, 
	defaultContent: string
): void => {
	if (!monaco.editor.getModel(uri)) {
		monaco.editor.createModel(defaultContent, "typescript", uri);
	}
};

/**
 * Verifies the TypeScript service is ready
 */
const verifyTypeScriptService = async (
	client: Monaco.languages.typescript.TypeScriptWorker,
	targetUri: Monaco.Uri,
	monaco: typeof Monaco
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	try {
		await client.getSyntacticDiagnostics(targetUri.toString());
		console.log("TypeScript service successfully initialized");
		return client;
	} catch (verifyError) {
		console.warn("TypeScript service not ready yet, retrying...", verifyError);
		return new Promise(resolve =>
			setTimeout(
				() => resolve(getInitializedTypeScriptService(monaco, targetUri)),
				300
			)
		);
	}
};

/**
 * Gets an initialized TypeScript language service
 */
const getInitializedTypeScriptService = async (
	monaco: typeof Monaco,
	targetUri = monaco.Uri.parse(EDITOR_URI)
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	// Check if TypeScript is available
	if (!monaco.languages.typescript) {
		console.warn("TypeScript not registered yet, retrying...");
		return new Promise(resolve =>
			setTimeout(
				() => resolve(getInitializedTypeScriptService(monaco, targetUri)),
				200
			)
		);
	}

	try {
		// Configure TypeScript
		configureTypeScript(monaco);

		// Create model if needed
		ensureModelExists(monaco, targetUri, DEFAULT_CODE);

		// Get the TypeScript worker and create a client
		const worker = await monaco.languages.typescript.getTypeScriptWorker();
		const client = await worker(targetUri);

		// Verify the service is ready
		return verifyTypeScriptService(client, targetUri, monaco);
	} catch (error) {
		console.error("TypeScript initialization failed, retrying...", error);
		return new Promise(resolve =>
			setTimeout(
				() => resolve(getInitializedTypeScriptService(monaco, targetUri)),
				500
			)
		);
	}
};

/**
 * Get hover information from TypeScript service
 */
const getHoverInfo = async (
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker,
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
) => {
	const uri = model.uri.toString();
	const offset = model.getOffsetAt(position);
	return await tsLanguageService.getQuickInfoAtPosition(uri, offset);
};

/**
 * Format hover information for display
 */
const formatHoverInfo = (hoverInfo: any, model: Monaco.editor.ITextModel) => {
	// Clean up the display text by replacing Type$n with Type
	let displayText =
		hoverInfo.displayParts ?
			hoverInfo.displayParts
				.map((part: DisplayPart) => part.text)
				.join("")
		:	"";

	// Replace Type aliases like Type$6 with standard Type alias
	displayText = displayText.replace(/Type\$\d+/g, "Type");

	const contents = [{ value: "```typescript\n" + displayText + "\n```" }];

	if (hoverInfo.documentation) {
		const docs = hoverInfo.documentation
			.map((part: DisplayPart) => part.text)
			.join("\n\n");

		if (docs.trim()) contents.push({ value: docs });
	}

	return {
		contents,
		range: {
			startLineNumber: model.getPositionAt(hoverInfo.textSpan.start).lineNumber,
			startColumn: model.getPositionAt(hoverInfo.textSpan.start).column,
			endLineNumber: model.getPositionAt(
				hoverInfo.textSpan.start + hoverInfo.textSpan.length
			).lineNumber,
			endColumn: model.getPositionAt(
				hoverInfo.textSpan.start + hoverInfo.textSpan.length
			).column
		}
	};
};

/**
 * Setup custom hover provider
 */
const setupHoverProvider = (
	monaco: typeof Monaco, 
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
): void => {
	monaco.languages.registerHoverProvider("typescript", {
		provideHover: async (model, position) => {
			try {
				// Create unique key for deduplication
				const requestKey = `${model.uri.toString()}:${position.lineNumber}:${position.column}`;
				
				// Skip if duplicate request
				if (deduplicateRequest(recentHoverRequests, requestKey)) {
					return null;
				}

				// Get hover information
				const hoverInfo = await getHoverInfo(tsLanguageService, model, position);
				if (!hoverInfo) return null;

				return formatHoverInfo(hoverInfo, model);
			} catch (error) {
				console.error("Error providing hover info:", error);
				return null;
			}
		}
	});
};

/**
 * Get completions from TypeScript service
 */
const getCompletions = async (
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker,
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
) => {
	const uri = model.uri.toString();
	const offset = model.getOffsetAt(position);
	return await tsLanguageService.getCompletionsAtPosition(uri, offset);
};

/**
 * Format completions for display
 */
const formatCompletions = (
	completions: CompletionInfo,
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
) => {
	const monacoSuggestions: Monaco.languages.CompletionItem[] = [];

	for (let i = 0; i < completions.entries.length; i++) {
		const tsSuggestion = completions.entries[i];
		
		if (tsSuggestion.kind !== "string") continue;

		const word = model.getWordUntilPosition(position);
		const range = {
			startLineNumber: position.lineNumber,
			endLineNumber: position.lineNumber,
			startColumn: word.startColumn,
			endColumn: word.endColumn
		};

		const monacoSuggestion: Monaco.languages.CompletionItem = {
			label: tsSuggestion.name,
			kind: MonacoCompletionItemKind.Constant,
			insertText: tsSuggestion.name,
			range,
			sortText: tsSuggestion.sortText,
			detail: tsSuggestion.kind
		};

		monacoSuggestions.push(monacoSuggestion);
	}

	return { suggestions: monacoSuggestions };
};

/**
 * Setup completion provider for string literals
 */
const setupCompletionProvider = (
	monaco: typeof Monaco, 
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
): void => {
	monaco.languages.registerCompletionItemProvider("typescript", {
		triggerCharacters: ['"', "'", "`"],
		provideCompletionItems: async (model, position) => {
			try {
				// Create unique key for deduplication
				const requestKey = `${model.uri.toString()}:${position.lineNumber}:${position.column}`;
				
				// Skip if duplicate request
				if (deduplicateRequest(recentCompletionRequests, requestKey)) {
					return { suggestions: [] };
				}

				// Get completions
				const completions = await getCompletions(tsLanguageService, model, position);
				if (!completions) return { suggestions: [] };

				return formatCompletions(completions, model, position);
			} catch (error) {
				console.error("Error providing completions:", error);
				return { suggestions: [] };
			}
		}
	});
};

/**
 * Setup TextMate grammar for syntax highlighting
 */
const setupTextmateGrammar = async (monaco: typeof Monaco): Promise<void> => {
	await wireTmGrammars(
		monaco,
		new Registry({
			getGrammarDefinition: async () => ({
				format: "json",
				content: arktypeTextmate
			})
		}),
		new Map().set("typescript", "source.ts")
	);
};

/**
 * Apply custom styling to editor
 */
const applyEditorStyling = (editor: Monaco.editor.IStandaloneCodeEditor): void => {
	const editorElement = editor.getDomNode();

	if (editorElement) {
		editorElement.style.borderRadius = "16px";
		editorElement.style.boxShadow =
			"0 10px 15px 0 rgba(0, 0, 0, 0.3), 0 15px 30px 0 rgba(0, 0, 0, 0.22)";
		editorElement.style.transition =
			"all 0.3s cubic-bezier(.25,.8,.25,1)";
		editorElement.style.backdropFilter = "blur(16px)";
		
		const guard = editorElement.querySelector(
			".overflow-guard"
		) as HTMLElement | null;
		
		if (guard) guard.style.borderRadius = "16px";
	}
};

/**
 * Initialize and configure Monaco editor
 */
const setupMonaco = async (monaco: typeof Monaco): Promise<void> => {
	await loadWASM("/onigasm.wasm");
	
	// Setup theme
	monaco.editor.defineTheme("arkdark", theme);

	// Initialize TypeScript service
	const tsLanguageService = await getInitializedTypeScriptService(monaco);

	// Setup providers
	setupHoverProvider(monaco, tsLanguageService);
	setupCompletionProvider(monaco, tsLanguageService);
	
	// Setup syntax highlighting
	await setupTextmateGrammar(monaco);
};

/**
 * Playground component
 */
export const Playground = () => {
	const [loaded, setLoaded] = useState(false);
	const monaco = useMonaco();

	if (monaco && !loaded) {
		// Add a small delay to ensure Monaco is fully loaded
		setTimeout(() => {
			setupMonaco(monaco).then(() => setLoaded(true));
		}, 100);
	}

	return loaded ? (
		<Editor
			height="30vh"
			defaultLanguage="typescript"
			path={EDITOR_URI}
			theme="arkdark"
			options={{
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				quickSuggestions: { strings: "on" },
				quickSuggestionsDelay: 0
			}}
			onMount={applyEditorStyling}
		/>
	) : "Loading...";
};
