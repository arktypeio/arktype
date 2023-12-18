// import type { EmbedId } from "./createStackblitzDemo.js"

// export const buildStackblitzIndexText = (embedId: EmbedId) => {
// 	const demoInfo = demoAdapters[embedId]
// 	const fileImports = demoInfo[0]
// 	const dataObject = demoInfo[1]

// 	return `import {populateDemo} from "./populateDemo"
// (async () => {
//     try {
//         ${fileImports}
//         populateDemo(${dataObject})
//     } catch(e) {
//         populateDemo({
//             type: {
//                 definition: ""
//             },
//             data: "",
//             errors: "ParseError: " + e.originalErr.message
//           } as any)
//     }
// })()`
// }

// type DemoAdapter = [importFromDemo: string, dataFromImports: string]

// const demoAdapters: Record<EmbedId, DemoAdapter> = {
// 	type: [
// 		`const { user, out, errors } = await import("./type")`,
// 		`{ type: user, out, errors }`
// 	],
// 	scope: [
// 		`const { types, out, errors } = await import("./scope")`,
// 		"{ type: types.package, out, errors }"
// 	],
// 	demo: [
// 		`const { pkg, out, errors } = await import("./demo")`,
// 		`{ type: pkg, out, errors }`
// 	]
// }
