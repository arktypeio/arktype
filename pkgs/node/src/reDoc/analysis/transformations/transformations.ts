import { transformToFunction } from "./toFunction.js"
import { PackageApi } from "../getPackageApi.js"
import { PackageContext } from "../getPackageContext.js"
import { ReDocContext } from "../../reDoc.js"

export type TransformationKind = "toFunction"

export type TransformationData = {
    kind: TransformationKind
    value: any
}

export type Transformations = Record<string, TransformationData>

export const getPackageTransformations = (
    api: PackageApi,
    ctx: PackageContext,
    reDocCtx: ReDocContext
) => {
    const transformations: Transformations = {}
    for (const member of api.getMembers()) {
        // Treat non-functional values with @param tags like functions
        if (
            member.kind !== "Function" &&
            member.docComment?.includes("@param")
        ) {
            transformations[member.name] = {
                kind: "toFunction",
                value: transformToFunction(member, api, ctx, reDocCtx)
            }
        }
    }
    return transformations
}
