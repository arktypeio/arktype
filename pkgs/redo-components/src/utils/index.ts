import { StoryDecorator } from "@storybook/react"

const muiAddon = require("storybook-addon-material-ui")
export const muiTheme = muiAddon.muiTheme as (...args: any[]) => StoryDecorator
