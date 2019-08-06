import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { Menu } from "."

storiesOf("Menu", module)
    .addDecorator(withTheme())
    .add("Basic", () => (
        <Menu
            options={{
                Logout: () => console.log("out"),
                Login: () => console.log("in")
            }}
            buttonText="Click here for puns!"
        />
    ))
