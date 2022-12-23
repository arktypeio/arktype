import type { ProjectOptions } from "ts-morph"
import { Project, ResolutionHosts } from "ts-morph"
import { getAttestConfig } from "../common.js"

export type ForceGetTsProjectOptions = {
    useRealFs: boolean
    preloadFiles: boolean
}

export const forceCreateTsMorphProject = ({
    preloadFiles = false,
    useRealFs = false
}: ForceGetTsProjectOptions) => {
    const config = getAttestConfig()
    const options: ProjectOptions = {
        compilerOptions: {
            diagnostics: true,
            noEmit: true,
            composite: false,
            incremental: false
        },
        skipAddingFilesFromTsConfig: !preloadFiles && !useRealFs
    }
    if (process.versions.deno) {
        options.resolutionHost = ResolutionHosts.deno
    }
    if (config.tsconfig) {
        options.tsConfigFilePath = config.tsconfig
    }
    const project = new Project(options)
    if (preloadFiles) {
        if (useRealFs) {
            project.addSourceFilesAtPaths(["**"])
        } else {
            if (!config.typeSources) {
                throw Error(`Can't use virtual project without typeSources`)
            }
            for (const [path, contents] of config.typeSources) {
                project.createSourceFile(path, contents, { overwrite: true })
            }
            console.log(config.typeSources.map(([path]) => path))
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
