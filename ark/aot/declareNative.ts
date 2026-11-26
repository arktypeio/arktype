import { throwError } from "./util.ts"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import type * as ts from "typescript"
import type * as tsgoAst from "typescript-7/ast"
import type * as tsgo from "typescript-7/sync"
import {
	sharedDeclarationFile,
	writeSharedCollisionMessage,
	type Frontend,
	type Inferred,
	type NativeChecker,
	type OpenedDeclarationProject,
	type SolutionReferences,
	type TypeScript
} from "./declare.ts"
import type { ModuleResolver } from "./declareShapes.ts"

// TypeScript 7 is native, so its types are read through its API's IPC client,
// which tsgo serves and tsrs serves the same way. Its objects are viewed as
// TypeScript 6's, so the shapes are printed and named as they are there, and its
// declarations, which no transformer can rewrite, are rewritten as text.

type Sync = typeof tsgo
type Ast = typeof tsgoAst

interface Native {
	sync: Sync
	ast: Ast
	version: string
}

// the specifiers each checker's API is loaded from, the first installed winning.
// The repo installs TypeScript 7 as `typescript-7` beside TypeScript 6
const entriesByChecker: Record<NativeChecker, string[]> = {
	tsgo: ["typescript", "typescript-7"],
	// tsrs still exports the API from tsgo's previous unstable/ subpaths
	tsrs: ["tsrs/unstable"]
}

const isResolvable = (require: NodeJS.Require, specifier: string) => {
	try {
		require.resolve(specifier)
		return true
	} catch {
		return false
	}
}

// tsrs's binary ships in a per-platform optional dependency, so it installs
// without one on a platform it doesn't build for
const hasTsrsBinary = (require: NodeJS.Require) => {
	if (!isResolvable(require, "tsrs/package.json")) return false
	if (process.env.TSRS_BINARY) return true
	const packagePath = require.resolve("tsrs/package.json")
	const requireTsrs = createRequire(packagePath)
	const { optionalDependencies = {} } = requireTsrs(packagePath)
	return Object.keys(optionalDependencies).some(name =>
		isResolvable(requireTsrs, `${name}/package.json`)
	)
}

const requiresFor = (cwd: string) =>
	[join(cwd, "package.json"), import.meta.url].map(from => createRequire(from))

const nativeVersionOf = (require: NodeJS.Require, entry: string) => {
	const name = entry.split("/")[0]
	try {
		return require(`${name}/package.json`).version as string
	} catch {
		return
	}
}

// TypeScript 7.0 has no API
const isNativeVersion = (version: string) =>
	/^(?:7\.(?:[1-9]|\d{2,})|(?:[89]|\d{2,})\.)/.test(version)

// the native checker installed, tsrs where its binary is
export const installedNativeChecker = (
	cwd: string
): NativeChecker | undefined => {
	for (const require of requiresFor(cwd)) {
		if (hasTsrsBinary(require)) return "tsrs"
		for (const entry of entriesByChecker.tsgo) {
			const version = nativeVersionOf(require, entry)
			if (version && isNativeVersion(version)) return "tsgo"
		}
	}
}

const loadNative = (cwd: string, checker: NativeChecker): Native => {
	for (const require of requiresFor(cwd)) {
		if (checker === "tsrs" && !hasTsrsBinary(require)) continue
		for (const entry of entriesByChecker[checker]) {
			const version = nativeVersionOf(require, entry)
			if (!version || (checker === "tsgo" && !isNativeVersion(version)))
				continue
			return {
				sync: require(`${entry}/sync`),
				ast: require(`${entry}/ast`),
				version
			}
		}
	}
	return throwError(writeNoNativeMessage(checker))
}

export const writeNoNativeMessage = (checker: NativeChecker): string =>
	checker === "tsgo" ?
		'checker: "tsgo" reads TypeScript 7.1 or later\'s API, which 7.0 releases lack. Install `typescript@7.1` or later'
	:	'checker: "tsrs" reads tsrs\'s API from its binary for this platform. Install it: `npm i -D tsrs`'

// what lays a program's declarations out
interface LayoutOptions {
	declarationDir?: string | undefined
	outDir?: string | undefined
	rootDir?: string | undefined
}

// as TypeScript reads a path where it was built
const isCaseSensitive =
	process.platform !== "win32" && process.platform !== "darwin"

const findConfig = (cwd: string): string | undefined => {
	for (let dir = cwd; ; dir = dirname(dir)) {
		const path = join(dir, "tsconfig.json")
		if (existsSync(path)) return path
		if (dirname(dir) === dir) return
	}
}

type Node = tsgoAst.Node
type SourceFile = tsgoAst.SourceFile
type RawType = tsgo.Type
type RawSymbol = tsgo.Symbol
type RawSignature = tsgo.Signature

// TypeScript 6's view of TypeScript 7's objects, each viewed once so a view's
// identity is its object's
class Views {
	native: Native
	project: tsgo.Project
	checker: tsgo.Checker
	types = new WeakMap<RawType, TypeView>()
	symbols = new WeakMap<RawSymbol, SymbolView>()
	signatures = new WeakMap<RawSignature, SignatureView>()
	declarations = new Map<string, Node | undefined>()

	constructor(native: Native, project: tsgo.Project) {
		this.native = native
		this.project = project
		this.checker = project.checker
	}

	type(t: RawType): ts.Type
	type(t: RawType | undefined): ts.Type | undefined
	type(t: RawType | undefined): ts.Type | undefined {
		if (!t) return
		let view = this.types.get(t)
		if (!view) this.types.set(t, (view = new TypeView(this, t)))
		return view as never
	}

	symbol(s: RawSymbol): ts.Symbol
	symbol(s: RawSymbol | undefined): ts.Symbol | undefined
	symbol(s: RawSymbol | undefined): ts.Symbol | undefined {
		if (!s) return
		let view = this.symbols.get(s)
		if (!view) this.symbols.set(s, (view = new SymbolView(this, s)))
		return view as never
	}

	signature(s: RawSignature): ts.Signature {
		let view = this.signatures.get(s)
		if (!view) this.signatures.set(s, (view = new SignatureView(this, s)))
		return view as never
	}

	// the node a handle names, fetching its file once
	resolve(handle: tsgo.NodeHandle | undefined): Node | undefined {
		if (!handle) return
		const key = `${handle.path}\0${handle.index}`
		if (!this.declarations.has(key))
			this.declarations.set(key, handle.resolve(this.project))
		return this.declarations.get(key)
	}
}

const rawOf = <t>(view: unknown): t => (view as { raw: t }).raw

class TypeView {
	views: Views
	raw: RawType
	cache: Record<string, unknown> = {}

	constructor(views: Views, raw: RawType) {
		this.views = views
		this.raw = raw
	}

	memo<t>(key: string, get: () => t): t {
		if (!(key in this.cache)) this.cache[key] = get()
		return this.cache[key] as t
	}

	get flags() {
		return this.raw.flags
	}

	get objectFlags() {
		return (this.raw as tsgo.ObjectType).objectFlags ?? 0
	}

	get symbol() {
		return this.memo("symbol", () => this.views.symbol(this.raw.getSymbol()))
	}

	get aliasSymbol() {
		return this.memo("aliasSymbol", () =>
			this.views.symbol(this.raw.getAliasSymbol())
		)
	}

	get aliasTypeArguments() {
		return this.memo("aliasTypeArguments", () => {
			if (!this.raw.getAliasSymbol()) return
			return this.raw.getAliasTypeArguments().map(t => this.views.type(t))
		})
	}

	get types() {
		return this.memo("types", () =>
			(this.raw as tsgo.UnionOrIntersectionType)
				.getTypes()
				.map(t => this.views.type(t))
		)
	}

	get value() {
		const { value } = this.raw as tsgo.LiteralType
		return typeof value === "bigint" ?
				{
					negative: value < 0n,
					base10Value: String(value < 0n ? -value : value)
				}
			:	value
	}

	get target() {
		return this.memo("target", () =>
			this.views.type((this.raw as tsgo.TypeReference).getTarget())
		)
	}

	// as a reference's target
	get typeParameters() {
		return this.memo("typeParameters", () => {
			const parameters = (this.raw as tsgo.InterfaceType).getTypeParameters()
			return parameters.length ?
					parameters.map(t => this.views.type(t))
				:	undefined
		})
	}

	get outerTypeParameters() {
		return this.memo("outerTypeParameters", () => {
			const parameters = (
				this.raw as tsgo.InterfaceType
			).getOuterTypeParameters()
			return parameters.length ?
					parameters.map(t => this.views.type(t))
				:	undefined
		})
	}

	get elementFlags() {
		return (this.raw as tsgo.TupleType).elementFlags
	}

	get readonly() {
		return (this.raw as tsgo.TupleType).readonly
	}

	isUnion() {
		return this.raw.isUnionType()
	}

	isIntersection() {
		return this.raw.isIntersectionType()
	}

	isUnionOrIntersection() {
		return this.raw.isUnionType() || this.raw.isIntersectionType()
	}

	isStringLiteral() {
		return this.raw.isStringLiteralType()
	}

	isNumberLiteral() {
		return this.raw.isNumberLiteralType()
	}

	getCallSignatures() {
		return this.memo("callSignatures", () =>
			this.raw.getCallSignatures().map(s => this.views.signature(s))
		)
	}

	getConstructSignatures() {
		return this.memo("constructSignatures", () =>
			this.raw.getConstructSignatures().map(s => this.views.signature(s))
		)
	}
}

class SymbolView {
	views: Views
	raw: RawSymbol
	resolvedDeclarations: Node[] | undefined

	constructor(views: Views, raw: RawSymbol) {
		this.views = views
		this.raw = raw
	}

	get name() {
		return this.raw.name
	}

	get escapedName() {
		return this.raw.escapedName
	}

	get flags() {
		return this.raw.flags
	}

	get checkFlags() {
		return this.raw.checkFlags
	}

	get declarations() {
		return (this.resolvedDeclarations ??= this.raw.declarations.flatMap(
			handle => this.views.resolve(handle) ?? []
		))
	}

	get valueDeclaration() {
		return this.views.resolve(this.raw.valueDeclaration)
	}
}

class SignatureView {
	views: Views
	raw: RawSignature

	constructor(views: Views, raw: RawSignature) {
		this.views = views
		this.raw = raw
	}

	get typeParameters() {
		return this.raw.typeParameters?.length ?
				this.raw.getTypeParameters().map(t => this.views.type(t))
			:	undefined
	}

	get thisParameter() {
		return this.raw.thisParameter ?
				this.views.symbol(this.raw.getThisParameter())
			:	undefined
	}

	get parameters() {
		return this.raw.getParameters().map(s => this.views.symbol(s))
	}

	get declaration() {
		return this.views.resolve(this.raw.declaration)
	}
}

// TypeScript 6's checker, as far as the declarations read one
const checkerOf = (views: Views): ts.TypeChecker => {
	const { checker } = views
	const { ast } = views.native
	const type = (t: RawType) => views.type(t)
	const symbols = (symbols: readonly RawSymbol[]) =>
		symbols.map(s => views.symbol(s))
	const view = {
		getTypeOfSymbol: (s: ts.Symbol) =>
			type(checker.getTypeOfSymbol(rawOf<RawSymbol>(s))),
		getDeclaredTypeOfSymbol: (s: ts.Symbol) =>
			type(checker.getDeclaredTypeOfSymbol(rawOf<RawSymbol>(s))),
		getSymbolAtLocation: (node: Node) =>
			views.symbol(
				ast.isSourceFile(node) ?
					checker.getSymbolOfSourceFile(node.fileName)
				:	checker.getSymbolAtLocation(node)
			),
		getSignatureFromDeclaration: (node: tsgoAst.SignatureDeclaration) => {
			const signature = checker.getSignatureFromDeclaration(node)
			return signature && views.signature(signature)
		},
		getReturnTypeOfSignature: (s: ts.Signature) =>
			type(checker.getReturnTypeOfSignature(rawOf<RawSignature>(s))),
		getTypePredicateOfSignature: (s: ts.Signature) =>
			checker.getTypePredicateOfSignature(rawOf<RawSignature>(s)),
		getTypeAtLocation: (node: Node) => type(checker.getTypeAtLocation(node)),
		getTypeArguments: (t: ts.Type) =>
			checker
				.getTypeArguments(rawOf<tsgo.TypeReference>(t))
				.map(arg => type(arg)),
		getPropertiesOfType: (t: ts.Type) =>
			symbols(checker.getPropertiesOfType(rawOf<RawType>(t))),
		getPropertyOfType: (t: ts.Type, name: string) =>
			views.symbol(checker.getPropertyOfType(rawOf<RawType>(t), name)),
		getIndexInfosOfType: (t: ts.Type) =>
			checker.getIndexInfosOfType(rawOf<RawType>(t)).map(info => ({
				keyType: type(info.keyType),
				type: type(info.valueType),
				isReadonly: info.isReadonly
			})),
		isArrayType: (t: ts.Type) => checker.isArrayType(rawOf<RawType>(t)),
		isTupleType: (t: ts.Type) => checker.isTupleType(rawOf<RawType>(t)),
		typeToString: (t: ts.Type, _?: unknown, flags?: number) =>
			checker.typeToString(rawOf<RawType>(t), undefined, flags),
		getUndefinedType: () => type(checker.getUndefinedType()),
		resolveName: (
			name: string,
			location: Node | undefined,
			meaning: number,
			excludeGlobals: boolean
		) =>
			views.symbol(
				checker.resolveName(name, meaning, location, excludeGlobals)
			),
		getExportsOfModule: (s: ts.Symbol) =>
			symbols(checker.getExportsOfModule(rawOf<RawSymbol>(s))),
		tryGetMemberInModuleExports: (name: string, s: ts.Symbol) =>
			views.symbol(checker.getMemberInModuleExports(rawOf<RawSymbol>(s), name)),
		getAliasedSymbol: (s: ts.Symbol) =>
			views.symbol(checker.getAliasedSymbol(rawOf<RawSymbol>(s)))
	}
	return view as never
}

// TypeScript 6's namespace, as far as the declarations read one
const typeScriptOf = (native: Native): TypeScript => {
	const { sync, ast } = native
	const leadingComments = (node: Node) => {
		const file = node.getSourceFile()
		const text = file.text
		return (ast.getLeadingCommentRanges(text, node.pos) ?? []).map(range => ({
			text: text.slice(range.pos + 2, range.end - 2)
		}))
	}
	return {
		...ast,
		TypeFlags: sync.TypeFlags,
		ObjectFlags: sync.ObjectFlags,
		SymbolFlags: sync.SymbolFlags,
		ElementFlags: sync.ElementFlags,
		ModifierFlags: sync.ModifierFlags,
		TypeFormatFlags: sync.TypeFormatFlags,
		DiagnosticCategory: sync.DiagnosticCategory,
		isParameter: ast.isParameterDeclaration,
		isPropertySignature: ast.isPropertySignatureDeclaration,
		isMethodSignature: ast.isMethodSignatureDeclaration,
		forEachChild: <t>(node: Node, visit: (child: Node) => t | undefined) =>
			node.forEachChild(visit),
		findAncestor: (
			node: Node | undefined,
			isMatch: (node: Node) => boolean
		) => {
			for (; node; node = node.parent) if (isMatch(node)) return node
		},
		getNameOfDeclaration: (node: { name?: Node }) => node.name,
		getCheckFlags: (s: ts.Symbol) => (s as unknown as SymbolView).checkFlags,
		// a declaration's text is all there is to tell elision from
		getSyntheticLeadingComments: leadingComments,
		getOriginalNode: (node: Node) => node
	} as never
}

const programOf = (
	project: tsgo.Project,
	checker: ts.TypeChecker
): ts.Program => {
	const view = {
		getTypeChecker: () => checker,
		getCompilerOptions: () => project.program.getCompilerOptions(),
		getCurrentDirectory: () => project.currentDirectory,
		getSourceFile: (path: string) => project.program.getSourceFile(path)
	}
	return view as never
}

const moduleResolverOf = (
	api: tsgo.API,
	views: Views,
	program: ts.Program
): ModuleResolver => {
	const checker = program.getTypeChecker()
	const resolver = api.createModuleResolver(
		views.project.program.getCompilerOptions()
	)
	return (specifier, source) => {
		const ambient = checker.resolveName(
			`"${specifier}"`,
			undefined,
			views.native.sync.SymbolFlags.ValueModule as never,
			false
		)
		if (ambient) return ambient
		const resolved = resolver.resolveModuleName(
			specifier,
			dirname(source.fileName)
		).resolvedModule
		const file = resolved && program.getSourceFile(resolved.resolvedFileName)
		return file && checker.getSymbolAtLocation(file)
	}
}

interface Edit {
	start: number
	end: number
	text: string
}

const isMarked = (node: Node, file: SourceFile) =>
	file.text.slice(node.pos, node.getStart(file)).includes("/*elided*/")

const writtenTypeOf = (file: SourceFile) =>
	(file.statements[0] as tsgoAst.TypeAliasDeclaration).type

const applyEdits = (text: string, edits: Edit[]) =>
	edits
		.sort((l, r) => r.start - l.start)
		.reduce(
			(text, edit) =>
				text.slice(0, edit.start) + edit.text + text.slice(edit.end),
			text
		)

// the code TypeScript 7 reports a declaration it writes as any with
const cyclicCode = 5088

export const openNative = (
	cwd: string,
	checker: NativeChecker,
	tsconfig: string | undefined
): OpenedDeclarationProject => {
	const native = loadNative(cwd, checker)
	const { sync, ast } = native
	const configPath =
		tsconfig ?
			resolve(cwd, tsconfig)
		:	(findConfig(cwd) ??
			throwError(
				`No tsconfig.json is in ${cwd} or a directory above it. Create ${join(cwd, "tsconfig.json")}, as { "compilerOptions": { "rootDir": "src", "outDir": "dist" }, "include": ["src"] }, or name the one tsc builds with as --tsconfig, or as "tsconfig" in ark.json.`
			))
	const api = new sync.API({ cwd })
	const project =
		api
			.createSnapshot({ openProjects: [configPath] })
			.getConfiguredProject(configPath) ??
		throwError(`${configPath} couldn't be read as a tsconfig`)
	const views = new Views(native, project)
	const tsView = typeScriptOf(native)
	const checkerView = checkerOf(views)
	const program = programOf(project, checkerView)
	const raw = project.program
	const emitted = raw
		.getSourceFileNames()
		.flatMap(fileName => {
			const file = raw.getSourceFile(fileName)
			return (
					file &&
						!file.isDeclarationFile &&
						!raw.isSourceFileFromExternalLibrary(file) &&
						/\.[cm]?[jt]sx?$/.test(file.fileName)
				) ?
					[file]
				:	[]
		})
		.sort((l, r) => (l.fileName < r.fileName ? -1 : 1))
	if (!emitted.length) {
		const parsed = api.parseConfigFile(configPath)
		if (!parsed.fileNames.length && parsed.projectReferences?.length) {
			const configDiagnostics = raw.getConfigFileParsingDiagnostics()
			const referencePaths = parsed.projectReferences.map(({ path }) =>
				/\.json$/i.test(path) ? path : join(path, "tsconfig.json")
			)
			const result: SolutionReferences = {
				configPath,
				references: referencePaths,
				diagnostics: sync.formatDiagnostics(configDiagnostics, {
					getCanonicalFileName: path => path,
					getCurrentDirectory: () => cwd,
					getNewLine: () => "\n"
				}),
				errors: configDiagnostics.filter(
					diagnostic => diagnostic.category === sync.DiagnosticCategory.Error
				).length
			}
			api.close()
			return result
		}
	}
	const emit = raw.getDeclarationEmit(emitted.map(file => file.fileName))
	const outputsBySource = new Map<string, [path: string, text: string]>()
	const declarationPathByFile: Record<string, string | undefined> = {}
	const options: LayoutOptions = raw.getCompilerOptions()
	const root =
		options.declarationDir ??
		options.outDir ??
		options.rootDir ??
		dirname(configPath)
	const sharedPath = `${root}/${sharedDeclarationFile}`
	const canonical = (path: string) =>
		isCaseSensitive ? path : path.toLowerCase()
	for (const [path, output] of emit.outputFiles as unknown as [
		string,
		{ text: string; sourceFileName: string }
	][]) {
		if (!/\.d\.[cm]?ts$/.test(path)) continue
		if (canonical(path) === canonical(sharedPath))
			throwError(writeSharedCollisionMessage(output.sourceFileName))
		outputsBySource.set(output.sourceFileName, [path, output.text])
		declarationPathByFile[output.sourceFileName] = path
	}
	// what the last emit redeclared, so TypeScript's cycle that it named isn't reported
	let redeclared = new Set<Inferred>()
	let inferredInFile = new Map<string, Inferred[]>()
	const emitModules: Frontend["emitModules"] = ({
		inferredByNode,
		retype,
		onElided
	}) => {
		redeclared = new Set()
		inferredInFile = new Map()
		const indexByFile = new Map<
			string,
			{ byName: Record<string, Inferred>; default?: Inferred }
		>()
		const nodeByInferred = new Map<Inferred, Node>()
		for (const [node, inferred] of inferredByNode) {
			nodeByInferred.set(inferred, node as unknown as Node)
			const { fileName } = inferred
			if (!indexByFile.has(fileName)) indexByFile.set(fileName, { byName: {} })
			const index = indexByFile.get(fileName)!
			if (ast.isExportAssignment(node as never)) index.default = inferred
			else index.byName[inferred.key] = inferred
			if (!inferredInFile.has(fileName)) inferredInFile.set(fileName, [])
			inferredInFile.get(fileName)!.push(inferred)
		}
		const files: Record<string, string> = {}
		const parsed: tsgo.RetainedSourceFile[] = []
		for (const source of emitted) {
			const output = outputsBySource.get(source.fileName)
			if (!output) continue
			const [path, text] = output
			const index = indexByFile.get(source.fileName)
			if (!index) {
				files[path] = text
				reportElided(api, path, text, source.fileName, onElided, ast)
				continue
			}
			const retained = api.createSourceFile(path, text)
			parsed.push(retained)
			const declaration = retained.sourceFile
			const exported = declaration.statements.find(ast.isExportAssignment)
			const defaultName =
				exported &&
				ast.isIdentifier(exported.expression) &&
				exported.expression.text
			const inferredNamed = (name: string) =>
				name === defaultName ? index.default : index.byName[name]
			const edits: Edit[] = []
			// a type as TypeScript's checker writes it, parsed where it can be read
			const writtenOf = (inferred: Inferred) => {
				const node = nodeByInferred.get(inferred)
				if (!node) return
				const text = project.checker.typeToString(
					rawOf<RawType>(inferred.type),
					node,
					sync.TypeFormatFlags.NoTruncation |
						sync.TypeFormatFlags.MultilineObjectLiterals
				)
				const retained = api.createSourceFile(
					`${path}.written.d.ts`,
					`type Written = ${text};\n`
				)
				parsed.push(retained)
				return retained
			}
			// a type to declare where TypeScript declared none, as a destructured
			// name, is written as its checker writes it
			const retyped = (
				inferred: Inferred,
				type: tsgoAst.TypeNode | undefined
			): string | undefined => {
				// TypeScript 7.1 declares a type a cycle recurs in as any, which its
				// checker still writes out whole, with any where the cycle recurs
				const isCycleAny =
					!type ||
					(type.kind === ast.SyntaxKind.AnyKeyword &&
						!(inferred.type.flags & sync.TypeFlags.Any))
				const written = isCycleAny ? writtenOf(inferred) : undefined
				const file = written?.sourceFile ?? declaration
				const node = written ? writtenTypeOf(written.sourceFile) : type
				if (!node) return
				// tsrs, like 6, marks where it elides a cycle, but not everywhere
				const result = retype(inferred, node as never, source as never, true)
				if (!result) return
				if (!result.byNode) {
					redeclared.add(inferred)
					return result.printed
				}
				const start = node.getStart(file)
				const replacements: [Node, string][] = [
					...([...result.byNode] as unknown as [Node, string][]),
					// marked as TypeScript 6 marks a cycle it elides
					...(result.unnamedCycles as unknown as Node[])
						.filter(cycle => !isMarked(cycle, file))
						.map((cycle): [Node, string] => [cycle, "/*elided*/ any"])
				]
				const named = applyEdits(
					node.getText(file),
					replacements.map(([replaced, text]) => ({
						start: replaced.getStart(file) - start,
						end: replaced.end - start,
						text
					}))
				)
				const isElided =
					/\/\*elided\*\//.test(named) ||
					(isCycleAny && (!written || result.unnamedCycles.length > 0))
				// a cycle no shape names is declared as printed, where it could be
				if (isElided && result.printed !== undefined) {
					redeclared.add(inferred)
					return result.printed
				}
				if (!written) return replacements.length ? named : undefined
				if (!isElided) redeclared.add(inferred)
				return named
			}
			const retypeNode = (
				inferred: Inferred | undefined,
				type: Node | undefined
			) => {
				if (!inferred || !type) return
				const text = retyped(inferred, type as tsgoAst.TypeNode)
				if (text !== undefined)
					edits.push({ start: type.getStart(declaration), end: type.end, text })
			}
			for (const statement of declaration.statements) {
				if (ast.isVariableStatement(statement)) {
					for (const declared of statement.declarationList.declarations) {
						if (ast.isIdentifier(declared.name))
							retypeNode(inferredNamed(declared.name.text), declared.type)
						else if (ast.isObjectBindingPattern(declared.name)) {
							edits.push(
								...destructured(
									declared,
									index.byName,
									retyped,
									declaration,
									ast
								)
							)
						}
					}
				} else if (ast.isFunctionDeclaration(statement) && statement.name)
					retypeNode(index.byName[statement.name.text], statement.type)
			}
			const redeclaredText = applyEdits(text, edits)
			files[path] = redeclaredText
			reportElided(api, path, redeclaredText, source.fileName, onElided, ast)
		}
		for (const retained of parsed) retained.dispose()
		return files
	}
	const finish: Frontend["finish"] = () => {
		const elided: Inferred[] = []
		const diagnostics = [
			...raw.getConfigFileParsingDiagnostics(),
			...raw.getGlobalDiagnostics(),
			...emitted.flatMap(file => [
				...raw.getSyntacticDiagnostics(file.fileName),
				...raw.getSemanticDiagnostics(file.fileName)
			]),
			...emit.diagnostics.filter(diagnostic => {
				if (diagnostic.code !== cyclicCode || !diagnostic.fileName) return true
				// a destructured const is reported for its pattern, which holds each name
				const reported = inferredInFile
					.get(diagnostic.fileName)
					?.filter(
						inferred =>
							inferred.pos < diagnostic.end! && diagnostic.pos! < inferred.end
					)
				if (!reported?.length) return true
				// TypeScript 7.1 writes a cycle it can't name as any and reports it,
				// where 6 wrote it as any without a word, so either is warned of alike
				for (const inferred of reported)
					if (!redeclared.has(inferred)) elided.push(inferred)
				return false
			})
		]
		return {
			diagnostics: sync.formatDiagnostics(diagnostics, {
				getCanonicalFileName: path => path,
				getCurrentDirectory: () => cwd,
				getNewLine: () => "\n"
			}),
			errors: diagnostics.filter(
				diagnostic => diagnostic.category === sync.DiagnosticCategory.Error
			).length,
			elided: elided.map(({ fileName, key }) => ({ fileName, name: key }))
		}
	}
	return {
		configPath,
		ts: tsView,
		program,
		emitted: emitted as never,
		root,
		sharedPath,
		declarationPathByFile,
		resolveModule: moduleResolverOf(api, views, program),
		emitModules,
		finish,
		dispose: () => api.close()
	}
}

// `const { a, b } = scope(...).export()`, which TypeScript 7 declares as one
// destructured const, is declared as a const each, as 6 declares it
const destructured = (
	declared: tsgoAst.VariableDeclaration,
	byName: Record<string, Inferred>,
	retyped: (inferred: Inferred, type: undefined) => string | undefined,
	declaration: SourceFile,
	ast: Ast
): Edit[] => {
	const pattern = declared.name as tsgoAst.ObjectBindingPattern
	const consts: string[] = []
	for (const element of pattern.elements) {
		if (
			element.propertyName ||
			!element.name ||
			!ast.isIdentifier(element.name)
		)
			return []
		const inferred = byName[element.name.text]
		const type = inferred && retyped(inferred, undefined)
		if (type === undefined) return []
		consts.push(`${element.name.text}: ${type}`)
	}
	return [
		{
			start: declared.getStart(declaration),
			end: declared.end,
			text: consts.join(", ")
		}
	]
}

const reportElided = (
	api: tsgo.API,
	path: string,
	text: string,
	fileName: string,
	onElided: (fileName: string, name: string) => void,
	ast: Ast
) => {
	if (!text.includes("/*elided*/")) return
	const retained = api.createSourceFile(path, text)
	const file = retained.sourceFile
	for (const statement of file.statements) {
		const declarations: Node[] =
			ast.isVariableStatement(statement) ?
				[...statement.declarationList.declarations]
			:	[statement]
		for (const declaration of declarations) {
			if (!declaration.getText(file).includes("/*elided*/")) continue
			const name = (declaration as { name?: Node }).name
			onElided(
				fileName,
				name && ast.isIdentifier(name) ? name.text : "a declaration"
			)
		}
	}
	retained.dispose()
}
