import React from "react"
import { storiesOf } from "@storybook/react"
import { Button } from "../buttons"
import { Menu } from "."

storiesOf("Menu", module).add("Basic", () => (
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
