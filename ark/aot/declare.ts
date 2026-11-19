import { flatMorph, throwError, type KeySet } from "@ark/util"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { dirname, relative } from "node:path/posix"
import type * as ts from "typescript"
import { installedNativeChecker, openNative } from "./declareNative.ts"
import {
	isElidedNode,
	ShapeReferences,
	type ModuleResolver,
	type ShapeNames
} from "./declareShapes.ts"

// TypeScript's JS API (5.5 to 6), its native port (7.1 or later) or tsrs, a
// port of that, which serves the same API
export type Checker = "tsjs" | "tsgo" | "tsrs"

export type NativeChecker = Exclude<Checker, "tsjs">

export const checkers: readonly Checker[] = ["tsjs", "tsgo", "tsrs"]

export interface DeclareOptions {
	cwd?: string | undefined
	tsconfig?: string | undefined
	// the checker that reads the program, by default the TypeScript installed:
	// tsjs for 5.5 to 6, and for 7, tsrs where its binary is installed or else tsgo
	checker?: Checker | undefined
}

export interface Declarations {
	// each file's text by its path, the shared shapes at `${root}/~arktype.d.ts`
	files: Record<string, string>
	root: string
	shapes: number
	diagnostics: string
	errors: number
}

export const sharedDeclarationFile = "~arktype.d.ts"

// a top-level declaration's type as the build declares it: its shape printed
// whole, or as tsc declared it with each shape it writes out named
export type Retyped =
	| { printed: string; byNode?: undefined }
	| {
			printed: string | undefined
			byNode: Map<ts.Node, string>
			// where TypeScript wrote any for a cycle no shape names
			unnamedCycles: ts.Node[]
	  }

export interface DeclarationEmit {
	inferredByNode: Map<ts.Node, Inferred>
	retype: (
		inferred: Inferred,
		declared: ts.TypeNode | undefined,
		source: ts.SourceFile,
		isAnyElided?: boolean
	) => Retyped | undefined
	onElided: (fileName: string, name: string) => void
}

// a checker's program and how it declares each module
export interface Frontend {
	ts: TypeScript
	program: ts.Program
	emitted: ts.SourceFile[]
	root: string
	sharedPath: string
	declarationPathByFile: Record<string, string | undefined>
	resolveModule?: ModuleResolver | undefined
	// each module's declaration, by its path
	emitModules: (emit: DeclarationEmit) => Record<string, string>
	// what the checker reports once the declarations are settled
	finish: () => {
		diagnostics: string
		errors: number
		// a cycle the checker reported where it declared any
		elided?: { fileName: string; name: string }[]
	}
	dispose?: () => void
}

export const emitDeclarations = (opts?: DeclareOptions): Declarations => {
	const cwd = resolve(opts?.cwd ?? ".")
	const checker = opts?.checker ?? defaultCheckerOf(cwd)
	const frontend =
		checker === "tsjs" ?
			openJs(cwd, opts?.tsconfig)
		:	openNative(cwd, checker, opts?.tsconfig)
	try {
		return declareWith(frontend, cwd)
	} finally {
		frontend.dispose?.()
	}
}

// TypeScript 5.5 to 6 where it's installed as `typescript`, TypeScript 7's
// native API where it is instead, and TypeScript 6 installed beside it otherwise
export const defaultCheckerOf = (cwd: string): Checker => {
	const version = typeScriptVersionOf(cwd)
	if (version && jsVersion.test(version)) return "tsjs"
	return installedNativeChecker(cwd) ?? "tsjs"
}

const typeScriptVersionOf = (cwd: string) => {
	for (const from of [join(cwd, "package.json"), import.meta.url]) {
		try {
			return createRequire(from)("typescript/package.json").version as string
		} catch {
			// not installed where it looks, so the next place is read
		}
	}
}

const jsVersion = /^(?:5\.(?:[5-9]|\d{2,})|6)\./

const declareWith = (frontend: Frontend, cwd: string): Declarations => {
	const { ts, program, emitted, root, sharedPath, declarationPathByFile } =
		frontend
	const printer = new ShapePrinter(
		ts,
		program,
		root,
		sharedPath,
		declarationPathByFile
	)
	const inferredByNode = inferredOf(ts, printer.checker, emitted)
	const inferred = [...inferredByNode.values()]
	printer.nameAll(inferred)
	let shapes = printer.settle(inferred)
	const references = new ShapeReferences(
		ts,
		program,
		printer,
		frontend.resolveModule
	)
	let elided: string[] = []
	let files: Record<string, string> = {}
	const elidedMessageOf = (fileName: string, name: string) =>
		writeElidedMessage(relative(tsPath(cwd), tsPath(fileName)), name)
	// a shape only a library's type holds, like a morph's input, is named once
	// a declaration reaches it, so the modules are emitted again to read its name
	for (let isSettled = false; !isSettled; ) {
		elided = []
		files = frontend.emitModules({
			inferredByNode,
			retype: (inferred, declared, source, isAnyElided) =>
				retypeOf({
					printer,
					references,
					inferred,
					declared,
					source,
					isAnyElided
				}),
			onElided: (fileName, name) => elided.push(elidedMessageOf(fileName, name))
		})
		isSettled = !printer.nameReached()
		if (!isSettled) shapes = printer.settle(inferred)
	}
	if (shapes.length) {
		files[sharedPath] =
			`// the shapes of this build's Types, Scopes and Modules\n${shapes.join("\n")}\n`
	}
	const finished = frontend.finish()
	for (const { fileName, name } of finished.elided ?? []) {
		const message = elidedMessageOf(fileName, name)
		if (!elided.includes(message)) elided.push(message)
	}
	return {
		files,
		root,
		shapes: shapes.length,
		diagnostics:
			finished.diagnostics + elided.map(message => `${message}\n`).join(""),
		errors: finished.errors
	}
}

interface Retyping {
	printer: ShapePrinter
	references: ShapeReferences
	inferred: Inferred
	declared: ts.TypeNode | undefined
	source: ts.SourceFile
	isAnyElided: boolean | undefined
}

// a declaration that can't be printed whole keeps what tsc wrote, but for
// each shape in it the build names
const retypeOf = ({
	printer,
	references,
	inferred,
	declared,
	source,
	isAnyElided
}: Retyping): Retyped | undefined => {
	const { printed } = inferred
	if (inferred.isHolding && printed !== undefined) return { printed }
	if (!declared || !printer.enter(source.fileName)) return
	const byNode = references.in({
		node: declared,
		type: inferred.type,
		key: inferred.key,
		source,
		isAnyElided
	})
	printer.leave()
	return { printed, byNode, unnamedCycles: references.unnamedCycles }
}

const openJs = (cwd: string, tsconfig: string | undefined): Frontend => {
	const ts = loadTypeScript(cwd)
	const diagnostics: ts.Diagnostic[] = []
	const parsed = parseConfig(ts, cwd, tsconfig, diagnostics)
	const config = {
		...parsed,
		options: {
			...parsed.options,
			noEmit: false,
			declaration: true,
			emitDeclarationOnly: true
		}
	}
	const program = ts.createProgram({
		rootNames: config.fileNames,
		options: config.options,
		...(config.projectReferences && {
			projectReferences: config.projectReferences
		})
	})
	const emitted = emittedFilesOf(program)
	let emitDiagnostics: ts.Diagnostic[] = []
	return {
		ts,
		program,
		emitted,
		...layoutOf(ts, config, emitted),
		emitModules: emit => {
			emitDiagnostics = []
			return emitModules(
				program,
				emitted,
				redeclarationOf(ts, emit),
				emitDiagnostics
			)
		},
		finish: () => {
			diagnostics.push(
				...emitDiagnostics,
				// a dependency's diagnostics are left to its own build
				...program.getOptionsDiagnostics(),
				...program.getGlobalDiagnostics(),
				...emitted.flatMap(file => [
					...program.getSyntacticDiagnostics(file),
					...program.getSemanticDiagnostics(file)
				])
			)
			return {
				diagnostics: formatDiagnostics(ts, diagnostics, cwd),
				errors: diagnostics.filter(
					d => d.category === ts.DiagnosticCategory.Error
				).length
			}
		}
	}
}

// TypeScript 6 writes `any` for the cycle and reports nothing, so this is the
// only word of it
export const writeElidedMessage = (file: string, name: string): string =>
	`${file}: warning: ${name} is declared with any where its type refers to itself, which TypeScript can't write. Bind the Type, Scope or Module it holds to a top-level const, export each class its definition names, or annotate ${name}.`

const tsPath = (path: string) => path.split("\\").join("/")

export const writeNoTsconfigMessage = (cwd: string): string =>
	`No tsconfig.json is in ${cwd} or a directory above it. Create ${join(cwd, "tsconfig.json")}, as { "compilerOptions": { "rootDir": "src", "outDir": "dist" }, "include": ["src"] }, or name the one tsc builds with as --tsconfig, or as "tsconfig" in ark.json.`

export const writeSharedCollisionMessage = (file: string): string =>
	`${file} would be declared at ${sharedDeclarationFile}, which holds the shapes of the build's Types. Rename ${file}.`

// a driver that can't tell a build from a rebuild can't declare
export const refuseDeclare = (opts: object | undefined, name: string): void => {
	if (opts && "declare" in opts && opts.declare)
		throwError(writeDeclareFrameworkMessage(name))
}

export const writeDeclareFrameworkMessage = (name: string): string =>
	`declare: true needs a bundler that tells a plugin whether its build watches or serves, which ${name} doesn't, so run arktype-precompile --declare after building instead`

export const writeDeclaredOutsideMessage = (
	path: string,
	root: string
): string =>
	`${path} is declared outside ${root}, where the bundle can't hold it, so set rootDir to a directory holding every module the tsconfig emits`

export type TypeScript = typeof ts & {
	getCheckFlags: (symbol: ts.Symbol) => number
}

// a TypeScript 7 project installs TypeScript 6 as `typescript-6`
export const loadTypeScript = (cwd: string): TypeScript => {
	for (const from of [join(cwd, "package.json"), import.meta.url]) {
		const require = createRequire(from)
		for (const name of ["typescript", "typescript-6"]) {
			let candidate: Partial<typeof ts> | undefined
			try {
				candidate = require(name)
			} catch {
				continue
			}
			if (/^(?:5\.(?:[5-9]|\d{2,})|6)\./.test(candidate?.version ?? ""))
				return candidate as never
		}
	}
	return throwError(
		"--declare and --emit read the compiler API of TypeScript 5.5 to 6. Install `typescript`, or beside TypeScript 7, `typescript-6` as an alias: `npm i -D typescript-6@npm:typescript@6`"
	)
}

export const parseConfig = (
	ts: TypeScript,
	cwd: string,
	tsconfig: string | undefined,
	diagnostics: ts.Diagnostic[]
): ts.ParsedCommandLine => {
	const configPath =
		tsconfig ?
			resolve(cwd, tsconfig)
		:	(ts.findConfigFile(cwd, ts.sys.fileExists) ??
			throwError(writeNoTsconfigMessage(cwd)))
	const config = ts.getParsedCommandLineOfConfigFile(configPath, undefined, {
		...ts.sys,
		onUnRecoverableConfigFileDiagnostic: d => diagnostics.push(d)
	})
	if (!config) return throwError(formatDiagnostics(ts, diagnostics, cwd))
	diagnostics.push(...config.errors)
	return config
}

export const formatDiagnostics = (
	ts: TypeScript,
	diagnostics: ts.Diagnostic[],
	cwd: string
): string =>
	ts.formatDiagnostics(diagnostics, {
		getCanonicalFileName: path => path,
		getCurrentDirectory: () => cwd,
		getNewLine: () => "\n"
	})

export const emittedFilesOf = (program: ts.Program): ts.SourceFile[] =>
	program
		.getSourceFiles()
		.filter(
			file =>
				!file.isDeclarationFile &&
				!program.isSourceFileFromExternalLibrary(file) &&
				/\.[cm]?[jt]sx?$/.test(file.fileName)
		)
		.sort((l, r) => (l.fileName < r.fileName ? -1 : 1))

// emitting each module checks only what it reads, not every module
const emitModules = (
	program: ts.Program,
	emitted: ts.SourceFile[],
	redeclaration: ts.TransformerFactory<ts.SourceFile | ts.Bundle>,
	diagnostics: ts.Diagnostic[]
) => {
	const files: Record<string, string> = {}
	for (const file of emitted) {
		const result = program.emit(
			file,
			(fileName, text) => {
				if (/\.d\.[cm]?ts(?:\.map)?$/.test(fileName)) files[fileName] = text
			},
			undefined,
			true,
			{ afterDeclarations: [redeclaration] }
		)
		diagnostics.push(...result.diagnostics)
	}
	return files
}

const layoutOf = (
	ts: TypeScript,
	config: ts.ParsedCommandLine,
	emitted: ts.SourceFile[]
) => {
	// TypeScript 5 lays declarations out from the directory its emitted files share
	const commandLine = {
		...config,
		fileNames: emitted.map(file => file.fileName)
	}
	const { options } = config
	const root =
		options.declarationDir ??
		options.outDir ??
		options.rootDir ??
		dirname(options.configFilePath as string)
	const sharedPath = `${root}/${sharedDeclarationFile}`
	const canonical = (path: string) =>
		ts.sys.useCaseSensitiveFileNames ? path : path.toLowerCase()
	const declarationPathByFile: Record<string, string | undefined> = {}
	for (const { fileName } of emitted) {
		const path = ts
			.getOutputFileNames(
				commandLine,
				fileName,
				!ts.sys.useCaseSensitiveFileNames
			)
			.find(output => /\.d\.[cm]?ts$/.test(output))
		if (path && canonical(path) === canonical(sharedPath))
			throwError(writeSharedCollisionMessage(fileName))
		declarationPathByFile[fileName] = path
	}
	return { root, sharedPath, declarationPathByFile }
}

const specifierBetween = (fromDir: string, declarationPath: string) => {
	const specifier = relative(fromDir, declarationPath).replace(
		/\.d\.([cm]?)ts$/,
		".$1js"
	)
	return specifier.startsWith(".") ? specifier : `./${specifier}`
}

// a top-level declaration whose type TypeScript would infer
export interface Inferred {
	// names the shapes it holds, and a cycle no scope names
	key: string
	type: ts.Type
	fileName: string
	// where its source declares it
	pos: number
	end: number
	// a shape is named for the const that defines it, not one that aliases it
	// or a function returning it
	isAliasing: boolean
	// its type as its module can declare it
	printed?: string | undefined
	// whether that reads a Type, Scope or Module
	isHolding?: boolean
	isRefused?: true
}

const inferredOf = (
	ts: TypeScript,
	checker: ts.TypeChecker,
	emitted: ts.SourceFile[]
) => {
	const inferredByNode = new Map<ts.Node, Inferred>()
	for (const { fileName, statements } of emitted) {
		const add = (
			node: ts.Node,
			key: string,
			type: ts.Type,
			isAliasing: boolean
		) =>
			inferredByNode.set(node, {
				key,
				type,
				fileName,
				pos: node.pos,
				end: node.end,
				isAliasing
			})
		// e.g. each of `const { user, group } = scope({ ... }).export()`
		const addBound = (
			node: ts.VariableDeclaration | ts.BindingElement,
			isAliasing: boolean
		): void => {
			if (ts.isIdentifier(node.name)) {
				add(
					node,
					node.name.text,
					checker.getTypeOfSymbol(checker.getSymbolAtLocation(node.name)!),
					isAliasing
				)
			} else {
				for (const element of node.name.elements)
					if (ts.isBindingElement(element)) addBound(element, isAliasing)
			}
		}
		for (const statement of statements) {
			if (ts.isVariableStatement(statement)) {
				for (const declaration of statement.declarationList.declarations) {
					// an annotation is declared as written
					if (declaration.type) continue
					addBound(
						declaration,
						!!declaration.initializer &&
							ts.isIdentifier(declaration.initializer)
					)
				}
			} else if (ts.isFunctionDeclaration(statement)) {
				// its return type, as its parameters are annotated
				const signature =
					statement.name &&
					statement.body &&
					!statement.type &&
					checker.getSignatureFromDeclaration(statement)
				if (signature) {
					add(
						statement,
						statement.name!.text,
						checker.getReturnTypeOfSignature(signature),
						true
					)
				}
			} else if (
				ts.isExportAssignment(statement) &&
				!statement.isExportEquals &&
				!ts.isIdentifier(statement.expression)
			) {
				add(
					statement,
					"default",
					checker.getTypeAtLocation(statement.expression),
					false
				)
			}
		}
	}
	return inferredByNode
}

interface ArkReference {
	name: "Type" | "Scope" | "Module"
	args: ts.Type[]
}

const arkReferenceOf = (
	ts: TypeScript,
	checker: ts.TypeChecker,
	t: ts.Type
): ArkReference | undefined => {
	const file = t.symbol?.declarations?.[0]?.getSourceFile()
	if (
		!file ||
		!(t.flags & ts.TypeFlags.Object) ||
		!((t as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference)
	)
		return
	const module = arkDeclaration.exec(file.fileName)?.[1]
	const name =
		module?.startsWith("variants") ? "Type"
		: module === "scope" ? "Scope"
		: module === "module" ? "Module"
		: undefined
	if (name !== t.symbol.name) return
	const args = checker
		.getTypeArguments(t as ts.TypeReference)
		.slice(0, (t as ts.TypeReference).target.typeParameters?.length)
	// an empty $ is Type's default, so it's left out
	return (
			name === "Type" &&
				!checker.getPropertiesOfType(args[1]).length &&
				!checker.getIndexInfosOfType(args[1]).length
		) ?
			{ name, args: [args[0]] }
		:	{ name, args: [...args] }
}

const arkDeclaration =
	/[/\\](?:arktype|ark[/\\]type)[/\\](?:out[/\\])?(variants[/\\]\w+|scope|module)\.(?:d\.)?ts$/

const redeclarationOf = (
	ts: TypeScript,
	{ inferredByNode, retype, onElided }: DeclarationEmit
): ts.TransformerFactory<ts.SourceFile | ts.Bundle> => {
	// tsc declares a destructured name or `export default <expression>` as a
	// const of its own, which only its name ties to its source
	const boundByFile = new Map<ts.SourceFile, Record<string, Inferred>>()
	const defaultByFile = new Map<ts.SourceFile, Inferred>()
	for (const [node, inferred] of inferredByNode) {
		const file = node.getSourceFile()
		if (ts.isExportAssignment(node)) defaultByFile.set(file, inferred)
		else if (ts.isBindingElement(node)) {
			if (!boundByFile.has(file)) boundByFile.set(file, {})
			boundByFile.get(file)![inferred.key] = inferred
		}
	}
	return ctx => node => {
		if (!ts.isSourceFile(node)) return node
		const source = ts.getOriginalNode(node) as ts.SourceFile
		const exported = node.statements.find(ts.isExportAssignment)?.expression
		const defaultName = exported && ts.isIdentifier(exported) && exported.text
		const typeOf = (
			declared: ts.VariableDeclaration | ts.FunctionDeclaration,
			name?: string | false
		) => {
			const original = ts.getOriginalNode(declared)
			const inferred =
				original !== declared ? inferredByNode.get(original)
				: !name ? undefined
				: name === defaultName ? defaultByFile.get(source)
				: boundByFile.get(source)?.[name]
			if (!inferred) return
			const retyped = retype(inferred, declared.type, source)
			if (!retyped) return
			const printed =
				retyped.printed === undefined ?
					undefined
				:	ctx.factory.createTypeReferenceNode(retyped.printed)
			if (!retyped.byNode) return printed
			const { byNode } = retyped
			const visit = (node: ts.Node): ts.Node => {
				const reference = byNode.get(node)
				return reference === undefined ?
						ts.visitEachChild(node, visit, ctx)
					:	ctx.factory.createTypeReferenceNode(reference)
			}
			const named =
				byNode.size ? (visit(declared.type!) as ts.TypeNode) : undefined
			// a cycle no shape names is declared as printed, where it could be
			return printed && holdsElided(ts, named ?? declared.type!) ? printed : (
					named
				)
		}
		const redeclare = (declaration: ts.VariableDeclaration) => {
			const type = typeOf(
				declaration,
				ts.isIdentifier(declaration.name) && declaration.name.text
			)
			return type ?
					ctx.factory.updateVariableDeclaration(
						declaration,
						declaration.name,
						declaration.exclamationToken,
						type,
						declaration.initializer
					)
				:	declaration
		}
		const statements = node.statements.map(statement => {
			if (ts.isVariableStatement(statement)) {
				return ctx.factory.updateVariableStatement(
					statement,
					statement.modifiers,
					ctx.factory.updateVariableDeclarationList(
						statement.declarationList,
						statement.declarationList.declarations.map(redeclare)
					)
				)
			}
			const type = ts.isFunctionDeclaration(statement) && typeOf(statement)
			return type ?
					ctx.factory.updateFunctionDeclaration(
						statement,
						statement.modifiers,
						statement.asteriskToken,
						statement.name,
						statement.typeParameters,
						statement.parameters,
						type,
						statement.body
					)
				:	statement
		})
		for (const statement of statements) {
			for (const name of elidedIn(ts, statement))
				onElided(source.fileName, name)
		}
		return ctx.factory.updateSourceFile(node, statements)
	}
}

// whether TypeScript wrote `/*elided*/ any` for a cycle in it
const holdsElided = (ts: TypeScript, node: ts.Node): boolean =>
	isElidedNode(ts, node) ||
	!!ts.forEachChild(node, child => holdsElided(ts, child) || undefined)

const elidedIn = (ts: TypeScript, statement: ts.Statement): string[] => {
	const declarations: ts.Node[] =
		ts.isVariableStatement(statement) ?
			[...statement.declarationList.declarations]
		:	[statement]
	return declarations
		.filter(declaration => holdsElided(ts, declaration))
		.map(declaration => {
			const name = ts.getNameOfDeclaration(declaration as ts.Declaration)
			return name && ts.isIdentifier(name) ? name.text : "a declaration"
		})
}

class ShapePrinter implements ShapeNames {
	ts: TypeScript
	checker: ts.TypeChecker
	root: string
	sharedPath: string
	declarationPathByFile: Record<string, string | undefined>
	shapeFlags: number
	intrinsicFlags: number
	isExact: boolean
	shapeNames = new Map<ts.Type, string>()
	takenNames = new Set<string>()
	refused = new Set<ts.Type>()
	// each type a scope names, by its alias
	aliases = new Map<ts.Type, string>()
	// the shapes this pass reached that the next names
	unnamed = new Map<ts.Type, string>()
	// where a scope's alias or a Type's input or output asks for its name
	reached = this.unnamed
	inferred: Inferred[] = []
	// each Type's input and output where its shape isn't both, found once a
	// declaration holds a shape without a name
	sideNames: Map<ts.Type, string> | undefined
	// the shape each was distilled from
	sideBases = new Map<ts.Type, ts.Type>()
	// each object shape's text by its name
	textsByName = new Map<string, string>()
	// while one of them is printed, the name of each shape its Type's holds by
	// its text, as its own copy of one has the same
	heldByText: Map<string, string> | undefined
	keysByPrinting = new Map<ts.Type, string>()
	// the directory of the declaration file being printed
	fromDir: string
	// the shared file's specifier from a module's declaration, unset in the shared file
	shared: string | undefined
	// how many Types, Scopes and Modules hold what's being printed
	arkDepth = 0
	// whether the type being printed reads a Type, Scope or Module
	isHolding = false
	cycleCount = 0
	// set by a type no pass can print, which ends its print
	isFailed = false

	constructor(
		ts: TypeScript,
		program: ts.Program,
		root: string,
		sharedPath: string,
		declarationPathByFile: Record<string, string | undefined>
	) {
		this.ts = ts
		this.checker = program.getTypeChecker()
		this.root = root
		this.sharedPath = sharedPath
		this.declarationPathByFile = declarationPathByFile
		this.fromDir = root
		// specifiers are relative to the shared file, so these can't print in place
		this.shapeFlags =
			ts.TypeFlags.Object |
			ts.TypeFlags.Union |
			ts.TypeFlags.Intersection |
			ts.TypeFlags.EnumLiteral
		this.intrinsicFlags =
			ts.TypeFlags.Any |
			ts.TypeFlags.Unknown |
			ts.TypeFlags.String |
			ts.TypeFlags.Number |
			ts.TypeFlags.Boolean |
			ts.TypeFlags.BooleanLiteral |
			ts.TypeFlags.BigInt |
			ts.TypeFlags.ESSymbol |
			ts.TypeFlags.Void |
			ts.TypeFlags.Undefined |
			ts.TypeFlags.Null |
			ts.TypeFlags.Never |
			ts.TypeFlags.NonPrimitive
		this.isExact = !!program.getCompilerOptions().exactOptionalPropertyTypes
	}

	name(t: ts.Type, candidate: string): boolean {
		if (
			this.shapeNames.has(t) ||
			this.refused.has(t) ||
			!(t.flags & this.shapeFlags)
		)
			return false
		const base = shapeNameOf(candidate)
		let shape = base
		for (let i = 2; this.takenNames.has(shape); i++) shape = `${base}$${i}`
		this.takenNames.add(shape)
		this.shapeNames.set(t, shape)
		return true
	}

	// a Type, Scope or Module bound to a const names its shapes for the const
	nameAll(inferred: Inferred[]): void {
		this.inferred = inferred
		for (const isAliasing of [false, true]) {
			for (const { key, type, isAliasing: isAlias } of inferred) {
				const reference =
					isAlias === isAliasing && arkReferenceOf(this.ts, this.checker, type)
				if (!reference) continue
				for (const [i, arg] of reference.args.entries())
					this.name(arg, argKeyOf(reference, key, i))
			}
		}
	}

	// each pass names the shapes it reached, leaving what can't print to tsc
	settle(inferred: Inferred[]): string[] {
		// a cycle is named for its alias, which this pass finds in each scope
		for (const declaration of inferred) this.printInferred(declaration)
		let shapes: string[] = []
		let isSettled = false
		while (!isSettled) {
			shapes = []
			this.unnamed.clear()
			const unprintable: ts.Type[] = []
			for (const [t, name] of this.shapeNames) {
				this.isFailed = false
				const base = this.sideBases.get(t)
				this.heldByText = base && this.namesHeldBy(base)
				const printed = this.printShape(t, name)
				this.heldByText = undefined
				if (printed === undefined) unprintable.push(t)
				else {
					shapes.push(`export type ${name} = ${printed};`)
					this.textsByName.set(name, unindented(printed))
				}
			}
			for (const declaration of inferred) this.printInferred(declaration)
			let isNamed = false
			for (const [t, key] of this.unnamed)
				isNamed = this.name(t, key) || isNamed
			if (isNamed) continue
			for (const t of unprintable) {
				this.shapeNames.delete(t)
				this.refused.add(t)
			}
			isSettled = !unprintable.length
		}
		return shapes
	}

	printInferred(inferred: Inferred): void {
		if (inferred.isRefused || !this.enter(inferred.fileName)) return
		this.isHolding = false
		this.isFailed = false
		// what it reaches is named only if its declaration is the one printed here
		const reached = (this.reached = new Map<ts.Type, string>())
		inferred.printed = this.print(inferred.type, 0, inferred.key)
		inferred.isHolding = this.isHolding
		if (this.isFailed) inferred.isRefused = true
		else if (this.isHolding) {
			for (const [t, name] of reached)
				if (!this.unnamed.has(t)) this.unnamed.set(t, name)
		}
		this.reached = this.unnamed
		this.leave()
	}

	// prints from a module's declaration until it's left
	enter(fileName: string): boolean {
		const path = this.declarationPathByFile[fileName]
		if (!path) return false
		this.fromDir = dirname(path)
		this.shared = specifierBetween(this.fromDir, this.sharedPath)
		return true
	}

	leave(): void {
		this.fromDir = this.root
		this.shared = undefined
	}

	// names the shapes the modules' declarations reached as they were emitted
	nameReached(): boolean {
		let isNamed = false
		for (const [t, key] of this.unnamed) isNamed = this.name(t, key) || isNamed
		this.unnamed.clear()
		return isNamed
	}

	print(t: ts.Type, depth: number, key = "Cycle"): string | undefined {
		const shape = this.shapeNames.get(t)
		if (shape !== undefined) {
			return this.shared ?
					`import(${JSON.stringify(this.shared)}).${shape}`
				:	shape
		}
		if (this.shared !== undefined && !this.arkDepth) this.reach(t)
		const printed = this.printShape(t, key, depth)
		return (
			(printed !== undefined && this.heldByText?.get(unindented(printed))) ||
			printed
		)
	}

	namesHeldBy(t: ts.Type): Map<string, string> {
		const { checker } = this
		const heldByText = new Map<string, string>()
		const seen = new Set<ts.Type>()
		const add = (held: ts.Type): void => {
			if (seen.has(held) || seen.size > maxHeld) return
			seen.add(held)
			const name = this.shapeNames.get(held)
			const text = name === undefined ? undefined : this.textsByName.get(name)
			if (text?.startsWith("{\n") && !heldByText.has(text))
				heldByText.set(text, name!)
			if (held.isUnionOrIntersection()) {
				for (const member of held.types) add(member)
				return
			}
			if (!(held.flags & this.ts.TypeFlags.Object)) return
			const { objectFlags } = held as ts.ObjectType
			// an array's element, or the output of a morph's `To`
			if (objectFlags & this.ts.ObjectFlags.Reference) {
				for (const arg of checker.getTypeArguments(held as ts.TypeReference))
					add(arg)
			} else if (
				objectFlags &
				(this.ts.ObjectFlags.Anonymous | this.ts.ObjectFlags.Mapped)
			) {
				for (const property of checker.getPropertiesOfType(held))
					add(checker.getTypeOfSymbol(property))
				// a morph, as `(In: input) => To<output>`
				for (const signature of held.getCallSignatures()) {
					for (const parameter of signature.parameters)
						add(checker.getTypeOfSymbol(parameter))
					add(checker.getReturnTypeOfSignature(signature))
				}
			}
		}
		add(t)
		return heldByText
	}

	referenceTo(t: ts.Type): string | undefined {
		if (!this.isDistinct(t)) return
		const shape = this.shapeNames.get(t)
		if (shape === undefined) this.reach(t)
		else return `import(${JSON.stringify(this.shared)}).${shape}`
	}

	// asks the next pass to name a scope's alias or a Type's input or output
	reach(t: ts.Type): void {
		if (this.reached.has(t) || this.refused.has(t) || !this.isDistinct(t))
			return
		const name = this.aliases.get(t) ?? this.sides().get(t)
		if (name !== undefined) this.reached.set(t, name)
	}

	// whether a type is one definition's alone, so that being it is having come
	// from that definition. A literal union or a global like Date is the same
	// type wherever it's written, whatever wrote it
	isDistinct(t: ts.Type, depth = 0): boolean {
		const { ts, checker } = this
		// an array can hold itself without end, as `[[[...]]]`
		if (depth > maxNesting) return false
		if (t.isUnionOrIntersection())
			return t.types.some(member => this.isDistinct(member, depth + 1))
		if (!(t.flags & ts.TypeFlags.Object)) return false
		if (checker.isArrayType(t) || checker.isTupleType(t)) {
			return checker
				.getTypeArguments(t as ts.TypeReference)
				.some(element => this.isDistinct(element, depth + 1))
		}
		return (
			!!(
				(t as ts.ObjectType).objectFlags &
				(ts.ObjectFlags.Anonymous | ts.ObjectFlags.Mapped)
			) &&
			!t.getCallSignatures().length &&
			!t.getConstructSignatures().length &&
			checker.getPropertiesOfType(t).length > 0
		)
	}

	sides(): Map<ts.Type, string> {
		if (this.sideNames) return this.sideNames
		const { checker } = this
		const sideNames = (this.sideNames = new Map<ts.Type, string>())
		const add = (held: ts.Type, key: string): void => {
			const reference = arkReferenceOf(this.ts, checker, held)
			if (reference?.name === "Module") {
				for (const alias of checker.getPropertiesOfType(held))
					add(checker.getTypeOfSymbol(alias), alias.name)
			}
			if (reference?.name !== "Type") return
			const t = reference.args[0]
			const name = this.shapeNames.get(t) ?? this.aliases.get(t) ?? key
			for (const [property, side] of [
				["inferIn", "In"],
				["infer", "Out"]
			]) {
				const symbol = checker.getPropertyOfType(held, property)
				const distilled = symbol && checker.getTypeOfSymbol(symbol)
				if (
					distilled &&
					distilled !== t &&
					!this.shapeNames.has(distilled) &&
					!sideNames.has(distilled) &&
					this.isDistinct(distilled)
				) {
					sideNames.set(distilled, `${name}${side}`)
					this.sideBases.set(distilled, t)
				}
			}
		}
		for (const isAliasing of [false, true]) {
			for (const { key, type, isAliasing: isAlias } of this.inferred)
				if (isAlias === isAliasing) add(type, key)
		}
		return sideNames
	}

	printHeld(t: ts.Type, key: string): string | undefined {
		if (!arkReferenceOf(this.ts, this.checker, t)) return
		this.isFailed = false
		const printed = this.print(t, 0, key)
		return this.isFailed ? undefined : printed
	}

	printShape(t: ts.Type, key: string, depth = 0): string | undefined {
		if (this.isFailed) return
		if (this.keysByPrinting.has(t)) {
			this.cycleCount++
			this.nameCycle(t)
			return
		}
		// a type that expands as it's printed is left to TypeScript
		if (this.keysByPrinting.size > maxNesting) {
			this.isFailed = true
			return
		}
		this.keysByPrinting.set(t, key)
		const cycleCount = this.cycleCount
		const printed = this.printStructure(t, depth, key)
		this.keysByPrinting.delete(t)
		// naming a cycle can't print what failed without reaching one
		if (printed === undefined && cycleCount === this.cycleCount)
			this.isFailed = true
		return printed
	}

	// a cycle is named for each alias on it, or else for the key it recurs at
	nameCycle(t: ts.Type): void {
		let isOnCycle = false
		let isAliased = false
		for (const member of this.keysByPrinting.keys()) {
			isOnCycle ||= member === t
			const alias = isOnCycle ? this.aliases.get(member) : undefined
			if (alias === undefined) continue
			isAliased = true
			if (!this.unnamed.has(member)) this.unnamed.set(member, alias)
		}
		// a cycle of a type arktype didn't infer is TypeScript's to declare
		if (
			!isAliased &&
			!this.unnamed.has(t) &&
			(this.shared === undefined || this.arkDepth)
		)
			this.unnamed.set(t, this.keysByPrinting.get(t)!)
	}

	printArk(
		reference: ArkReference,
		depth: number,
		key: string
	): string | undefined {
		this.isHolding = true
		const $ = reference.args[reference.name === "Type" ? 1 : 0]
		if ($) this.addAliases($)
		this.arkDepth++
		const args = allPrinted(
			reference.args.map((arg, i) => {
				const argKey = argKeyOf(reference, key, i)
				if (
					arg.flags & this.shapeFlags &&
					!this.shapeNames.has(arg) &&
					!this.refused.has(arg) &&
					!this.unnamed.has(arg)
				)
					this.unnamed.set(arg, argKey)
				return this.print(arg, depth, argKey)
			})
		)
		this.arkDepth--
		return args && `import("arktype").${reference.name}<${args.join(", ")}>`
	}

	addAliases($: ts.Type): void {
		for (const alias of this.checker.getPropertiesOfType($)) {
			const t = this.checker.getTypeOfSymbol(alias)
			if (t.aliasSymbol?.name === "Submodule" && isArkExport(t.aliasSymbol)) {
				for (const submodule of t.aliasTypeArguments ?? [])
					this.addAliases(submodule)
			}
			// a private alias is referenced without its `#`
			else if (t.flags & this.shapeFlags && !this.aliases.has(t))
				this.aliases.set(t, alias.name.replace(/^#/, ""))
		}
	}

	printStructure(t: ts.Type, depth: number, key: string): string | undefined {
		const { ts, checker } = this
		if (t.flags & ts.TypeFlags.EnumLiteral) return this.printEnum(t)
		if (t.isStringLiteral()) return JSON.stringify(t.value)
		if (t.isNumberLiteral()) return String(t.value)
		if (t.flags & ts.TypeFlags.BigIntLiteral) {
			const { negative, base10Value } = (t as ts.BigIntLiteralType).value
			return `${negative ? "-" : ""}${base10Value}n`
		}
		if (this.isMissing(t)) return "never"
		if (t.flags & this.intrinsicFlags) return checker.typeToString(t)
		if (t.flags & (ts.TypeFlags.TemplateLiteral | ts.TypeFlags.StringMapping)) {
			const printed = checker.typeToString(
				t,
				undefined,
				ts.TypeFormatFlags.NoTruncation
			)
			// a type it holds that only an import could name
			return printed.includes("import(") ? undefined : printed
		}
		if (t.aliasSymbol && isArkExport(t.aliasSymbol)) {
			return this.printReference(
				`import("arktype").${t.aliasSymbol.name}`,
				t.aliasTypeArguments ?? [],
				depth
			)
		}
		if (t.isUnion()) return this.printUnion(t.types, depth, key)
		if (t.isIntersection()) {
			return allPrinted(
				t.types.map(member => this.printOperand(member, depth, key))
			)?.join(" & ")
		}
		if (!(t.flags & ts.TypeFlags.Object)) return
		if (checker.isArrayType(t)) {
			const element = this.printOperand(
				checker.getTypeArguments(t as ts.TypeReference)[0],
				depth,
				key
			)
			return (
				element &&
				`${t.symbol.name === "ReadonlyArray" ? "readonly " : ""}${element}[]`
			)
		}
		if (checker.isTupleType(t)) return this.printTuple(t, depth, key)
		const objectFlags = (t as ts.ObjectType).objectFlags
		if (objectFlags & (ts.ObjectFlags.Anonymous | ts.ObjectFlags.Mapped))
			return this.printObject(t as ts.ObjectType, depth, key)
		if (objectFlags & ts.ObjectFlags.Reference) {
			const reference = arkReferenceOf(ts, checker, t)
			if (reference) return this.printArk(reference, depth, key)
			const target = (t as ts.TypeReference).target
			return this.printReference(
				this.qualifierOf(target.symbol),
				checker
					.getTypeArguments(t as ts.TypeReference)
					.slice(0, target.typeParameters?.length ?? 0),
				depth
			)
		}
		if (objectFlags & (ts.ObjectFlags.Class | ts.ObjectFlags.Interface))
			return this.qualifierOf(t.symbol)
	}

	printOperand(t: ts.Type, depth: number, key: string): string | undefined {
		const printed = this.print(t, depth, key)
		return printed !== undefined && this.isCompound(t) ?
				`(${printed})`
			:	printed
	}

	isCompound(t: ts.Type): boolean {
		const { TypeFlags } = this.ts
		if (this.shapeNames.has(t)) return false
		if (t.isUnion()) {
			return (
				!(t.flags & (TypeFlags.Boolean | TypeFlags.EnumLiteral)) &&
				t.types.filter(member => !this.isMissing(member)).length > 1
			)
		}
		return t.isIntersection() || !!t.getCallSignatures().length
	}

	// the undefined an optional key or element's declaration leaves out
	isMissing(t: ts.Type): boolean {
		return (
			this.isExact &&
			!!(t.flags & this.ts.TypeFlags.Undefined) &&
			t !== this.checker.getUndefinedType()
		)
	}

	printUnion(
		members: readonly ts.Type[],
		depth: number,
		key: string
	): string | undefined {
		const nullish = this.ts.TypeFlags.Undefined | this.ts.TypeFlags.Null
		const booleans = members.filter(
			member => member.flags & this.ts.TypeFlags.BooleanLiteral
		)
		const isBoolean = booleans.length === 2
		// ordered as TypeScript prints them, with null and undefined last
		const printed = allPrinted(
			[
				...members.filter(member => !(member.flags & nullish)),
				...members.filter(member => member.flags & nullish)
			].flatMap(member =>
				this.isMissing(member) || (isBoolean && member === booleans[1]) ? []
				: isBoolean && member === booleans[0] ? ["boolean"]
				: [this.printOperand(member, depth, key)]
			)
		)
		return printed && (printed.join(" | ") || "never")
	}

	printTuple(t: ts.Type, depth: number, key: string): string | undefined {
		const { ElementFlags } = this.ts
		const target = (t as ts.TypeReference).target as ts.TupleType
		const elements = allPrinted(
			this.checker
				.getTypeArguments(t as ts.TypeReference)
				.slice(0, target.elementFlags.length)
				.map((element, i) => {
					const flags = target.elementFlags[i]
					const printed =
						flags & (ElementFlags.Rest | ElementFlags.Optional) ?
							this.printOperand(element, depth, key)
						:	this.print(element, depth, key)
					return (
						printed &&
						(flags & ElementFlags.Variadic ? `...${printed}`
						: flags & ElementFlags.Rest ? `...${printed}[]`
						: flags & ElementFlags.Optional ? `${printed}?`
						: printed)
					)
				})
		)
		return (
			elements &&
			`${target.readonly ? "readonly " : ""}[${elements.join(", ")}]`
		)
	}

	printObject(
		t: ts.ObjectType,
		depth: number,
		key: string
	): string | undefined {
		const { ts, checker } = this
		// TypeScript names a class, enum or namespace by `typeof`
		if (
			t.getConstructSignatures().length ||
			(t.symbol?.flags ?? 0) &
				(ts.SymbolFlags.Class | ts.SymbolFlags.Enum | ts.SymbolFlags.Module)
		)
			return
		const properties = checker.getPropertiesOfType(t)
		const indexInfos = checker.getIndexInfosOfType(t)
		const signatures = t.getCallSignatures()
		if (signatures.length) {
			return properties.length || indexInfos.length || signatures.length > 1 ?
					undefined
				:	this.printSignature(signatures[0], depth, key)
		}
		const members: (string | undefined)[] = indexInfos.map(info => {
			const indexKey = this.print(info.keyType, depth + 1)
			const value = this.print(info.type, depth + 1)
			return (
				indexKey &&
				value &&
				`${info.isReadonly ? "readonly " : ""}[k: ${indexKey}]: ${value}`
			)
		})
		for (const property of properties) {
			// a symbol key, which the shared file can't name
			if ((property.escapedName as string).startsWith("__@")) return
			const value = this.print(
				checker.getTypeOfSymbol(property),
				depth + 1,
				property.name
			)
			members.push(
				value &&
					`${this.isReadonly(property) ? "readonly " : ""}${
						identifier.test(property.name) ?
							property.name
						:	JSON.stringify(property.name)
					}${property.flags & ts.SymbolFlags.Optional ? "?" : ""}: ${value}`
			)
		}
		const printed = allPrinted(members)
		if (!printed) return
		if (!printed.length) return "{}"
		const indentation = "    ".repeat(depth + 1)
		return `{\n${printed.map(member => `${indentation}${member};\n`).join("")}${"    ".repeat(depth)}}`
	}

	printSignature(
		signature: ts.Signature,
		depth: number,
		key: string
	): string | undefined {
		const { ts, checker } = this
		if (
			signature.typeParameters ||
			signature.thisParameter ||
			checker.getTypePredicateOfSignature(signature)
		)
			return
		const parameters = allPrinted(
			signature.parameters.map(parameter => {
				const declaration = parameter.valueDeclaration
				// a destructured parameter has no name to declare
				if (!identifier.test(parameter.name)) return
				const printed = this.print(
					checker.getTypeOfSymbol(parameter),
					depth,
					parameter.name
				)
				if (printed === undefined) return
				if (!declaration || !ts.isParameter(declaration))
					return `${parameter.name}: ${printed}`
				return (
					declaration.dotDotDotToken ? `...${parameter.name}: ${printed}`
					: declaration.questionToken || declaration.initializer ?
						`${parameter.name}?: ${printed}`
					:	`${parameter.name}: ${printed}`
				)
			})
		)
		const returned = this.print(
			checker.getReturnTypeOfSignature(signature),
			depth,
			key
		)
		return parameters && returned && `(${parameters.join(", ")}) => ${returned}`
	}

	printReference(
		qualifier: string | undefined,
		args: readonly ts.Type[],
		depth: number
	): string | undefined {
		if (!qualifier || !args.length) return qualifier
		const printed = allPrinted(args.map(arg => this.print(arg, depth)))
		return printed && `${qualifier}<${printed.join(", ")}>`
	}

	printEnum(t: ts.Type): string | undefined {
		const declaration = t.symbol?.valueDeclaration
		if (!declaration) return
		if (this.ts.isEnumDeclaration(declaration))
			return this.qualifierOf(t.symbol)
		if (!this.ts.isEnumMember(declaration) || !identifier.test(t.symbol.name))
			return
		const qualifier = this.qualifierOf(
			this.checker.getSymbolAtLocation(declaration.parent.name)!
		)
		return qualifier && `${qualifier}.${t.symbol.name}`
	}

	qualifierOf(symbol: ts.Symbol): string | undefined {
		const { ts, checker } = this
		const declaration = symbol.declarations?.[0]
		if (!declaration) return
		if (isArkExport(symbol)) return `import("arktype").${symbol.name}`
		// a global is named through globalThis, which no shape can shadow
		if (
			checker.resolveName(
				symbol.name,
				undefined,
				ts.SymbolFlags.Type,
				false
			) === symbol
		)
			return `globalThis.${symbol.name}`
		const ambientModule = ts.findAncestor(
			declaration,
			node => ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)
		) as ts.ModuleDeclaration | undefined
		const moduleName = (ambientModule?.name as ts.StringLiteral | undefined)
			?.text
		const moduleSymbol = checker.getSymbolAtLocation(
			ambientModule?.name ?? declaration.getSourceFile()
		)
		// an augmentation's name is relative to its module, not the shared file
		const moduleFile = moduleSymbol?.declarations?.find(ts.isSourceFile)
		const specifier =
			moduleName && !moduleName.startsWith(".") ? moduleName
			: moduleFile && ts.isExternalModule(moduleFile) ?
				this.specifierOf(moduleFile.fileName)
			:	undefined
		const exported =
			specifier &&
			moduleSymbol &&
			checker
				.getExportsOfModule(moduleSymbol)
				.find(
					s =>
						s === symbol ||
						(s.flags & ts.SymbolFlags.Alias &&
							checker.getAliasedSymbol(s) === symbol)
				)
		return exported && `import(${JSON.stringify(specifier)}).${exported.name}`
	}

	specifierOf(fileName: string): string | undefined {
		const path = this.declarationPathByFile[fileName]
		return path && specifierBetween(this.fromDir, path)
	}

	isReadonly(property: ts.Symbol): boolean {
		const { Accessor, SetAccessor } = this.ts.SymbolFlags
		return (
			!!(this.ts.getCheckFlags(property) & readonlyCheckFlag) ||
			(property.flags & Accessor && !(property.flags & SetAccessor)) ||
			!!property.declarations?.some(
				declaration =>
					this.ts.getCombinedModifierFlags(declaration) &
					this.ts.ModifierFlags.Readonly
			)
		)
	}
}

// a mapped property is readonly only by its internal check flags
const readonlyCheckFlag = 8

const maxNesting = 100

// how many types a Type's input or output looks through for the shapes it holds
const maxHeld = 1000

// a Type's second argument is its scope
const argKeyOf = (reference: ArkReference, key: string, i: number) =>
	reference.name === "Type" && i === 1 ? `${key}Scope` : key

// a shape's text at any depth
const unindented = (printed: string) => printed.replace(/\n +/g, "\n")

const allPrinted = (printed: (string | undefined)[]) =>
	printed.includes(undefined) ? undefined : (printed as string[])

const identifier = /^[$A-Z_a-z][\w$]*$/

const isArkExport = (symbol: ts.Symbol) =>
	arkExportNames[symbol.name] === 1 &&
	arkExport.test(symbol.declarations?.[0]?.getSourceFile().fileName ?? "")

const arkExportNames: KeySet = {
	Default: 1,
	Out: 1,
	To: 1,
	Brand: 1,
	Json: 1,
	Submodule: 1
}

const arkExport =
	/[/\\](?:arktype|ark[/\\]type|@ark[/\\]util|ark[/\\]util)[/\\](?:out[/\\])?(?:attributes|generics|module|serialize)\.(?:d\.)?ts$/

const shapeNameOf = (candidate: string) => {
	const name = candidate.replace(/[^\w$]/g, "_")
	return /^[$A-Z_a-z]/.test(name) && reservedNames[name] !== 1 ?
			name
		:	`$${name}`
}

// names an alias reference can't use, being keywords or globals
const reservedNames: KeySet = flatMorph(
	"any as bigint boolean break case catch class const continue debugger default delete do else enum export extends false finally for function globalThis if import in infer instanceof keyof never new null number object readonly return string super switch symbol this throw true try typeof undefined unique unknown var void while with".split(
		" "
	),
	(_, name) => [name, 1] as const
)
