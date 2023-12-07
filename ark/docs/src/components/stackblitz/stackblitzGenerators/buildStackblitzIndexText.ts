import type { EmbedId } from "./createStackblitzDemo.js"

export const buildStackblitzIndexText = (embedId: EmbedId) => {
	const demoInfo = demoAdapters[embedId]
	const fileImports = demoInfo[0]
	const dataObject = demoInfo[1]

	return `import {populateDemo} from "./populateDemo"
(async () => {
    try {
        ${fileImports}
        populateDemo(${dataObject})
    } catch(e) {
        populateDemo({ 
            type: {
                definition: ""
            },
            data: "",
            problems: "ParseError: " + e.originalErr.message
          } as any)
    }
})()`
}

type DemoAdapter = [importFromDemo: string, dataFromImports: string]

const demoAdapters: Record<EmbedId, DemoAdapter> = {
	type: [
		`const { user, out, problems } = await import("./type")`,
		`{ type: user, out, problems }`
	],
	scope: [
		`const { types, out, problems } = await import("./scope")`,
		"{ type: types.package, out, problems }"
	],
	demo: [
		`const { pkg, out, problems } = await import("./demo")`,
		`{ type: pkg, out, problems }`
	]
}
