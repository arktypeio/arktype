import { defaultTheme } from "../themes"

const muiAddon = require("storybook-addon-material-ui")
export const withTheme = () => muiAddon.muiTheme(defaultTheme)
