import { defaultTheme } from "../themes"

const muiAddon = require("storybook-addon-material-ui")
export const withTheme = (theme = defaultTheme) => muiAddon.muiTheme(theme)
