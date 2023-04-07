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
        } else {
            if (!config.typeSources) {
                throw Error(`Can't use virtual project without typeSources`)
            }
            for (const [path, contents] of config.typeSources) {
                project.createSourceFile(path, contents, { overwrite: true })
            }
        }
    }
    return project
}

let __virtualProjectCache: undefined | Project
export const getVirtualTsMorphProject = () => {
    if (!__virtualProjectCache) {
        __virtualProjectCache = forceCreateTsMorphProject({
            useRealFs: false,
            preloadFiles: true
        })
    }
    return __virtualProjectCache
}

let __realProjectCache: undefined | Project
export const getRealTsMorphProject = () => {
    if (!__realProjectCache) {
        __realProjectCache = forceCreateTsMorphProject({
            useRealFs: true,
            preloadFiles: true
        })
    }
    return __realProjectCache
}
