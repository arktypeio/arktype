import type { ProjectOptions } from "ts-morph"
import { Project } from "ts-morph"
import { getAtTestConfig } from "../common.js"

export type ForceGetTsProjectOptions = {
    addFiles?: boolean
}

export const forceCreateTsMorphProject = ({
    addFiles
}: ForceGetTsProjectOptions = {}) => {
    const config = getAtTestConfig()
    const options: ProjectOptions = {
        compilerOptions: {
            diagnostics: true,
            noEmit: true,
            composite: false,
            incremental: false
        },
        skipAddingFilesFromTsConfig: !addFiles
    }
    if (config.tsconfig) {
        options.tsConfigFilePath = config.tsconfig
    }
    const project = new Project(options)
    if (!config.tsconfig && addFiles) {
        project.addSourceFilesAtPaths(["**"])
    }
    return project
}

let __projectCache: undefined | Project
export const getDefaultTsMorphProject = () => {
    if (!__projectCache) {
        __projectCache = forceCreateTsMorphProject({ addFiles: true })
    }
    return __projectCache
}
