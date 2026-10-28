import { flatMorph, throwError, type KeySet } from "@ark/util"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { dirname, relative } from "node:path/posix"
import type * as ts from "typescript"

export interface DeclareOptions {
	cwd?: string | undefined
	tsconfig?: string | undefined
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

export const emitDeclarations = (opts?: DeclareOptions): Declarations => {
	const cwd = resolve(opts?.cwd ?? ".")
	const ts = loadTypeScript(cwd)
	const diagnostics: ts.Diagnostic[] = []
	const parsed = parseConfig(ts, cwd, opts?.tsconfig, diagnostics)
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
	const { root, sharedPath, declarationPathByFile } = layoutOf(
		ts,
		config,
		emitted
	)
	const printer = new ShapePrinter(ts, program, fileName => {
		const path = declarationPathByFile[fileName]
		return path && specifierBetween(root, path)
	})
	const references = arkReferencesOf(ts, printer.checker, emitted)
	printer.nameAll(references)
	const shapes = printer.settle()
	const files = emitModules(
		program,
		emitted,
		redeclarationOf(printer, references, fileName => {
			const path = declarationPathByFile[fileName]
			return path && specifierBetween(dirname(path), sharedPath)
		}),
		diagnostics
	)
	if (shapes.length) {
		files[sharedPath] =
			`// the shapes of this build's Types, Scopes and Modules\n${shapes.join("\n")}\n`
	}
	// a dependency's diagnostics are left to its own build
	diagnostics.push(
		...program.getOptionsDiagnostics(),
		...program.getGlobalDiagnostics(),
		...emitted.flatMap(file => [
			...program.getSyntacticDiagnostics(file),
			...program.getSemanticDiagnostics(file)
		])
	)
	return {
		files,
		root,
		shapes: shapes.length,
		diagnostics: formatDiagnostics(ts, diagnostics, cwd),
		errors: diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error)
			.length
	}
}

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

interface ArkReference {
	symbol: ts.Symbol
	name: "Type" | "Scope" | "Module"
	args: ts.Type[]
}

const arkReferencesOf = (
	ts: TypeScript,
	checker: ts.TypeChecker,
	emitted: ts.SourceFile[]
) => {
	const defining: ArkReference[] = []
	const aliasing: ArkReference[] = []
	for (const file of emitted) {
		for (const statement of file.statements) {
			if (!ts.isVariableStatement(statement)) continue
			for (const declaration of statement.declarationList.declarations) {
				// an annotation is declared as written
				if (!ts.isIdentifier(declaration.name) || declaration.type) continue
				const symbol = checker.getSymbolAtLocation(declaration.name)!
				const reference = arkReferenceOf(
					ts,
					checker,
					symbol,
					checker.getTypeOfSymbol(symbol)
				)
				if (!reference) continue
				// a shape is named for the const that defines it, not one that aliases it
				if (declaration.initializer && ts.isIdentifier(declaration.initializer))
					aliasing.push(reference)
				else defining.push(reference)
			}
		}
	}
	return [...defining, ...aliasing]
}

const arkReferenceOf = (
	ts: TypeScript,
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
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
			{ symbol, name, args: [args[0]] }
		:	{ symbol, name, args: [...args] }
}

const arkDeclaration =
	/[/\\](?:arktype|ark[/\\]type)[/\\](?:out[/\\])?(variants[/\\]\w+|scope|module)\.(?:d\.)?ts$/

const redeclarationOf = (
	printer: ShapePrinter,
	references: ArkReference[],
	sharedSpecifierOf: (fileName: string) => string | undefined
): ts.TransformerFactory<ts.SourceFile | ts.Bundle> => {
	const { ts } = printer
	const referenceBySymbol = new Map(references.map(r => [r.symbol, r]))
	return ctx => node => {
		const shared = ts.isSourceFile(node) && sharedSpecifierOf(node.fileName)
		if (!shared) return node
		const redeclare = (declaration: ts.VariableDeclaration) => {
			const original = ts.getOriginalNode(declaration)
			const reference =
				ts.isVariableDeclaration(original) &&
				referenceBySymbol.get(
					printer.checker.getSymbolAtLocation(original.name)!
				)
			const declared = reference && printer.printDeclared(reference, shared)
			return declared ?
					ctx.factory.updateVariableDeclaration(
						declaration,
						declaration.name,
						declaration.exclamationToken,
						ctx.factory.createTypeReferenceNode(declared),
						declaration.initializer
					)
				:	declaration
		}
		return ctx.factory.updateSourceFile(
			node,
			node.statements.map(statement =>
				ts.isVariableStatement(statement) ?
					ctx.factory.updateVariableStatement(
						statement,
						statement.modifiers,
						ctx.factory.updateVariableDeclarationList(
							statement.declarationList,
							statement.declarationList.declarations.map(redeclare)
						)
					)
				:	statement
			)
		)
	}
}

class ShapePrinter {
	ts: TypeScript
	checker: ts.TypeChecker
	specifierOf: (fileName: string) => string | undefined
	shapeFlags: number
	intrinsicFlags: number
	isExact: boolean
	shapeNames = new Map<ts.Type, string>()
	takenNames = new Set<string>()
	refused = new Set<ts.Type>()
	cycles = new Map<ts.Type, string>()
	keysByPrinting = new Map<ts.Type, string>()

	constructor(
		ts: TypeScript,
		program: ts.Program,
		specifierOf: (fileName: string) => string | undefined
	) {
		this.ts = ts
		this.checker = program.getTypeChecker()
		this.specifierOf = specifierOf
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

	nameAll(references: ArkReference[]): void {
		for (const { symbol, args } of references) {
			for (let i = 0; i < args.length; i++)
				this.name(args[i], i === 0 ? symbol.name : `${symbol.name}Scope`)
		}
	}

	// each pass names the cycles it reached, leaving what can't print to tsc
	settle(): string[] {
		let shapes: string[] = []
		let isSettled = false
		while (!isSettled) {
			shapes = []
			this.cycles.clear()
			const unprintable: ts.Type[] = []
			for (const [t, name] of this.shapeNames) {
				const printed = this.printShape(t, name)
				if (printed === undefined) unprintable.push(t)
				else shapes.push(`export type ${name} = ${printed};`)
			}
			let isNamed = false
			for (const [t, key] of this.cycles) isNamed = this.name(t, key) || isNamed
			if (isNamed) continue
			for (const t of unprintable) {
				this.shapeNames.delete(t)
				this.refused.add(t)
			}
			isSettled = !unprintable.length
		}
		return shapes
	}

	printDeclared(reference: ArkReference, shared: string): string | undefined {
		const args = allPrinted(
			reference.args.map(arg => {
				const shape = this.shapeNames.get(arg)
				return (
					shape ? `import("${shared}").${shape}`
					: arg.flags & this.shapeFlags ? undefined
					: this.print(arg, 0)
				)
			})
		)
		return args && `import("arktype").${reference.name}<${args.join(", ")}>`
	}

	print(t: ts.Type, depth: number, key = "Cycle"): string | undefined {
		return this.shapeNames.get(t) ?? this.printShape(t, key, depth)
	}

	printShape(t: ts.Type, key: string, depth = 0): string | undefined {
		if (this.keysByPrinting.has(t)) {
			if (!this.cycles.has(t)) this.cycles.set(t, this.keysByPrinting.get(t)!)
			return
		}
		// a type that expands as it's printed is left to TypeScript
		if (this.keysByPrinting.size > maxNesting) return
		this.keysByPrinting.set(t, key)
		const printed = this.printStructure(t, depth, key)
		this.keysByPrinting.delete(t)
		return printed
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
			return this.printObject(t as ts.ObjectType, depth)
		if (objectFlags & ts.ObjectFlags.Reference) {
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

	printObject(t: ts.ObjectType, depth: number): string | undefined {
		const { ts, checker } = this
		if (t.getConstructSignatures().length) return
		const properties = checker.getPropertiesOfType(t)
		const indexInfos = checker.getIndexInfosOfType(t)
		const signatures = t.getCallSignatures()
		if (signatures.length) {
			return properties.length || indexInfos.length || signatures.length > 1 ?
					undefined
				:	this.printSignature(signatures[0], depth)
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

	printSignature(signature: ts.Signature, depth: number): string | undefined {
		const { ts, checker } = this
		if (signature.typeParameters || signature.thisParameter) return
		const parameters = allPrinted(
			signature.parameters.map(parameter => {
				const declaration = parameter.valueDeclaration
				if (
					declaration &&
					ts.isParameter(declaration) &&
					(declaration.dotDotDotToken ||
						declaration.questionToken ||
						declaration.initializer)
				)
					return
				const printed = this.print(checker.getTypeOfSymbol(parameter), depth)
				return printed && `${parameter.name}: ${printed}`
			})
		)
		const returned = this.print(
			checker.getReturnTypeOfSignature(signature),
			depth
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
		return exported && `import("${specifier}").${exported.name}`
	}

	isReadonly(property: ts.Symbol): boolean {
		return (
			!!(this.ts.getCheckFlags(property) & readonlyCheckFlag) ||
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
