import { writeJson } from "../../index.js"
import {
    getPackageTransformations,
    Transformations
} from "./transformations/index.js"
import { getPackageApi, PackageApi } from "./getPackageApi.js"
import { getPackageContext, PackageContext } from "./getPackageContext.js"
import { reDoc, ReDocContext } from "../reDoc.js"

export type PackageData = {
    ctx: PackageContext
    api: PackageApi
    transformations: Transformations
}

export const analyzePackage = (
    rootDir: string,
    reDocCtx: ReDocContext
): PackageData => {
    console.group(`Extracting your API from ${rootDir}...`)
    const ctx = getPackageContext(rootDir, reDocCtx)
    const api = getPackageApi(ctx, reDocCtx)
    const transformations = getPackageTransformations(api, ctx, reDocCtx)
    api.applyTransformations(transformations)
    writeJson(ctx.apiExtractorOutputPath, api.root)
    console.groupEnd()
    return { ctx, api, transformations }
}
