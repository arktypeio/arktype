import { defaultTheme } from "../styles"

const muiAddon = require("storybook-addon-material-ui")
export const withTheme = (theme = defaultTheme) => {
    console.log("in with theme")
    console.log(theme)
    const thing = muiAddon.muiTheme(theme)
    console.log(thing)
    return thing
}
