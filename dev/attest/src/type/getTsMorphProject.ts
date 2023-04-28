import { resolve } from "node:path"
import { Project, ts } from "ts-morph"
import { getAttestConfig } from "../config.js"

export type ForceGetTsProjectOptions = {
    useRealFs: boolean
    preloadFiles: boolean
}

export const forceCreateTsMorphProject = ({
    preloadFiles,
    useRealFs
}: ForceGetTsProjectOptions) => {
    const config = getAttestConfig()
    const project = new Project({
        compilerOptions: {
            diagnostics: true,
            module: ts.ModuleKind.NodeNext,
            target: ts.ScriptTarget.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeNext,
            skipLibCheck: true,
            strict: true,
            isolatedModules: true,
            esModuleInterop: true,
            resolveJsonModule: true,
            exactOptionalPropertyTypes: true,
            noErrorTruncation: true,
            lib: [
                resolve("node_modules", "typescript", "lib", "lib.esnext.d.ts")
            ]
        },
        skipAddingFilesFromTsConfig: !preloadFiles || !useRealFs
    })
    if (preloadFiles) {
        if (useRealFs) {
            project.addSourceFilesFromTsConfig(config.tsconfig!)
        }
    }
    return project
}

let __projectCache: undefined | Project
export const getTsMorphProject = () => {
    if (!__projectCache) {
        __projectCache = forceCreateTsMorphProject({
            useRealFs: true,
            preloadFiles: true
        })
    }
    return __projectCache
}
