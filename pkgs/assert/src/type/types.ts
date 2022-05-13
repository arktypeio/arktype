// import { SourcePosition } from "../positions.ts"
// import { getAbsolutePositions } from "@re-/tools"
// import { getTsProject } from "./ts.ts"
// import * as ts from "ts-morph"
// // import ts from "typescript"

// export type NodeFilter = (node: ts.Node) => boolean

// // export type NextTypeOptions = {
// //     positionOffset?: number
// //     returnsCount?: number
// //     findParentMatching?: NodeFilter
// //     nodeFilter?: NodeFilter
// // }

// // export const errorsOfNextType = (
// //     position: SourcePosition,
// //     options: NextTypeOptions = {}
// // ) => {
// //     const context = getTsProject()
// //     return nextTypedNode(context, position, options).errors.join("\n")
// // }

// // export const nextTypeToString = (
// //     position: SourcePosition,
// //     options: NextTypeOptions = {}
// // ) => {
// //     const context = getTsProject()
// //     const { type } = nextTypedNode(context, position, options)
// //     return context.ts.getTypeChecker().typeToString(type)
// // }

// const concatenateChainedErrors = (e: ts.DiagnosticMessageChain[]): string =>
//     e
//         .map(
//             (msg) =>
//                 `${msg.messageText}${
//                     msg.next ? concatenateChainedErrors(msg.next) : ""
//                 }`
//         )
//         .join("\n")

// const nextTypedNode = (
//     project: ts.Project,
//     { file, line, column }: SourcePosition,
//     {
//         positionOffset = 0,
//         findParentMatching = () => true,
//         returnsCount = 0,
//         nodeFilter = () => true
//     }: NextTypeOptions = {}
// ): { node: ts.Node; type: ts.Type; errors: string[] } => {
//     if (!(file in sources)) {
//         throw new Error(
//             `File '${file}' was unexpected. Files in context are:\n\n${Object.keys(
//                 sources
//             ).join("\n")}`
//         )
//     }
//     const checker = project.getTypeChecker()
//     const errors: ts.Diagnostic[] = project
//         // @ts-ignore
//         .getDiagnosticsProducingTypeChecker()
//         .getDiagnostics()
//     const errorsInFile = errors.filter((error) => error.file?.fileName === file)
//     const afterPosition =
//         getAbsolutePositions(sources[file], [{ line, column }])[0] +
//         positionOffset
//     const firstTypeAfter = (
//         node: ts.Node
//     ): { node: ts.Node; type: ts.Type; errors: string[] } | null => {
//         if (node.getStart() > afterPosition) {
//             while (!findParentMatching(node)) {
//                 node = node.parent
//             }
//             let nodeType = checker.getTypeAtLocation(node)
// const errorMessages = errorsInFile
//     .filter(
//         (e) =>
//             (e.start ?? -1) >= node.getStart() &&
//             (e.start ?? -1) + (e.length ?? 0) <= node.getEnd()
//     )
//     .map((e) => {
//         if (typeof e.messageText === "string") {
//             return e.messageText
//         }
//         return `${
//             e.messageText.messageText
//         }${concatenateChainedErrors(e.messageText.next ?? [])}`
//     })
//             if (
//                 // If intrinsic name is error but there are no corresponding
//                 // diagnostics, node should not have a type (e.g. something like "(")
//                 // so get the next match
//                 ((nodeType as any).intrinsicName !== "error" ||
//                     errorMessages.length) &&
//                 nodeFilter(node)
//             ) {
//                 while (returnsCount) {
//                     const signatures = checker
//                         .getTypeAtLocation(node)
//                         .getCallSignatures()
//                     if (!signatures.length) {
//                         throw new Error(
//                             `Cannot get return type of ${checker.typeToString(
//                                 nodeType
//                             )}.`
//                         )
//                     }
//                     nodeType = signatures[0].getReturnType()
//                     returnsCount--
//                 }
//                 return { node, type: nodeType, errors: errorMessages }
//             }
//         }
//         for (const child of node.getChildren()) {
//             if (child.getEnd() >= afterPosition) {
//                 const result = firstTypeAfter(child)
//                 if (result) {
//                     return result
//                 }
//             }
//         }
//         return null
//     }
//     const result = firstTypeAfter(project.getSourceFile(file)!)
//     if (!result) {
//         throw new Error(
//             `Found no valid types in ${file} after line ${line} column ${column}.`
//         )
//     }
//     return result
// }
