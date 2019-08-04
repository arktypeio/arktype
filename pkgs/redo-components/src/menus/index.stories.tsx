import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { Menu, MenuItem } from "."
import { PrimaryButton } from "../buttons"

storiesOf("Menu", module)
    .addDecorator(withTheme())
    .add("Basic", () => (
        <Menu
            Button={PrimaryButton}
            options={{
                Logout: () => console.log("out"),
                Login: () => console.log("in")
            }}
            buttonText="Click here for puns!"
        />
    ))
