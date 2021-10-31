import { dirName, mapFilesToContents, walkPaths } from "."
import { FilterFunction, withDefaults } from "@re-do/utils"
import ts, {
    CompilerOptions,
    createCompilerHost,
    createProgram
} from "typescript"

interface ILibMap {
    [libName: string]: string
}
interface IFileMap {
    [fileName: string]: string
}

class TypeScriptLanguageServiceHost implements ts.LanguageServiceHost {
    private readonly _ts: typeof import("typescript")
    private readonly _libs: ILibMap
    private readonly _files: IFileMap
    private readonly _compilerOptions: ts.CompilerOptions

    constructor(
        ts: typeof import("typescript"),
        libs: ILibMap,
        files: IFileMap,
        compilerOptions: ts.CompilerOptions
    ) {
        this._ts = ts
        this._libs = libs
        this._files = files
        this._compilerOptions = compilerOptions
    }

    // --- language service host ---------------

    getCompilationSettings(): ts.CompilerOptions {
        return this._compilerOptions
    }
    getScriptFileNames(): string[] {
        return ([] as string[])
            .concat(Object.keys(this._libs))
            .concat(Object.keys(this._files))
    }
    getScriptVersion(_fileName: string): string {
        return "1"
    }
    getProjectVersion(): string {
        return "1"
    }
    getScriptSnapshot(fileName: string): ts.IScriptSnapshot {
        if (this._files.hasOwnProperty(fileName)) {
            return this._ts.ScriptSnapshot.fromString(this._files[fileName])
        } else if (this._libs.hasOwnProperty(fileName)) {
            return this._ts.ScriptSnapshot.fromString(this._libs[fileName])
        } else {
            return this._ts.ScriptSnapshot.fromString("")
        }
    }
    getScriptKind(_fileName: string): ts.ScriptKind {
        return this._ts.ScriptKind.TS
    }
    getCurrentDirectory(): string {
        return ""
    }
    getDefaultLibFileName(_options: ts.CompilerOptions): string {
        return "defaultLib:es5"
    }
    isDefaultLibFileName(fileName: string): boolean {
        return fileName === this.getDefaultLibFileName(this._compilerOptions)
    }
}

export type TscOptions = CompilerOptions & {
    exclude?: FilterFunction<string>
    include?: FilterFunction<string>
}

export const tsc = (
    rootPath: string,
    { exclude, include, ...tsOptions }: TscOptions = {}
) => {
    const sources = walkPaths(rootPath, { exclude, include, excludeDirs: true })
    const options = withDefaults<CompilerOptions>({
        allowJs: true,
        declaration: true,
        noErrorTruncation: true
    })(tsOptions)

    // Create a Program with an in-memory emit
    const createdFiles: Record<string, string> = {}
    const host = createCompilerHost(options)

    host.writeFile = (fileName, contents) => (createdFiles[fileName] = contents)

    // Prepare and emit the d.ts files
    const program = createProgram(sources, options, host)
    const fileMap = program.getSourceFiles().map((_) => _.fileName)
    // .filter((name) => !program.getRootFileNames().includes(name))
    // const libFileMap = mapFilesToContents(libFiles)
    const service = ts.createLanguageService(
        new TypeScriptLanguageServiceHost(
            ts,
            {},
            mapFilesToContents(fileMap),
            options
        )
    )
    const emitted = program.emit()
    sources.forEach((path) => {
        // @ts-ignore
        program.getSourceFile(path)!.locals.forEach((local) => {
            const position = local.declarations[0].pos + 1
            const quickInfo = service.getQuickInfoAtPosition(path, position)
            const result = ts.displayPartsToString(quickInfo?.displayParts)
            if (result) {
                console.log(result)
            }
        })
    })
    // Object.entries(createdFiles).forEach(([fileName, contents]) => {
    //     console.log(`${fileName}:`)
    //     console.log(contents)
    // })
}

// const cwd = process.cwd()
// const pkg = basename(cwd)
// const outDir = join(cwd, "out")

// const addTypeToPackageJson = (name) => {
//     const packageJsonPath = join(outDir, name, "package.json")
//     const existingContent = existsSync(packageJsonPath)
//         ? JSON.parse(readFileSync(packageJsonPath).toString())
//         : {}
//     writeFileSync(
//         packageJsonPath,
//         JSON.stringify(
//             {
//                 ...existingContent,
//                 type: name === "cjs" ? "commonjs" : "module"
//             },
//             null,
//             4
//         )
//     )
// }

// const build = async () => {
//     try {
//         console.log(`redo-build🔨: Building ${pkg}...`)
//         await shellAsync("tsc --module esnext --outDir out/esm")
//         await shellAsync("tsc --module commonjs --outDir out/cjs")
//         await shellAsync("tsc ")
//         walkPaths(outDir)
//             .filter(
//                 (path) =>
//                     basename(path) === "__tests__" ||
//                     basename(path).endsWith(".stories.tsx")
//             )
//             .forEach((path) => rmSync(path, { recursive: true, force: true }))
//         console.log(`redo-build🔨: Finished building ${pkg}.`)
//     } catch (e) {
//         console.log(
//             "redo-build🔨:❗️Build failed due to the following error:❗️"
//         )
//         console.log(e)
//         process.exit(1)
//     }
// }

// build()
