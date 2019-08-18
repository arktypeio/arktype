import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { Menu } from "."
import { Button } from "../buttons"

storiesOf("Menu", module)
    .addDecorator(withTheme())
    .add("Basic", () => (
        <Menu>
            {{
                toggle: <Button>Open</Button>,
                options: {
                    Logout: () => console.log("out"),
                    Login: () => console.log("in")
                }
            }}
        </Menu>
    ))
