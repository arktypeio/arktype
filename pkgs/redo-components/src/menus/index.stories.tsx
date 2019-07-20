import React from "react"
import { storiesOf } from "@storybook/react"
import { muiTheme } from "../utils"
import { Menu, MenuItem } from "."
import { PrimaryButton } from "../buttons"

storiesOf("Menu", module)
    .addDecorator(muiTheme())
    .add("Single menu item", () => <MenuItem> This is a menu item </MenuItem>)
    .add("Full menu", () => (
        <Menu
            Button={PrimaryButton}
            options={{
                Logout: () => console.log("out"),
                Login: () => console.log("in")
            }}
            buttonText="Click here for puns!"
        />
    ))
