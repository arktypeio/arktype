import electronDevtoolsInstaller, {
    REACT_DEVELOPER_TOOLS,
    APOLLO_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS
} from "electron-devtools-installer"

export const installExtensions = async () => {
    const extensions = {
        REACT_DEVELOPER_TOOLS,
        APOLLO_DEVELOPER_TOOLS,
        REDUX_DEVTOOLS
    }
    for (const [name, reference] of Object.entries(extensions)) {
        try {
            console.log(`Installing ${name}...`)
            await electronDevtoolsInstaller(reference)
        } catch (e) {
            console.log(`Failed to install ${name}:`)
            console.log(e)
        }
    }
}
