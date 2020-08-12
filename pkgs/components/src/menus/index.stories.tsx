import React, { useRef } from "react"
import { storiesOf } from "@storybook/react"
import { Button } from "../buttons"
import { Menu, TogglableMenu } from "."
import { withKnobs, boolean as booleanKnob } from "@storybook/addon-knobs"

storiesOf("Menu", module)
    .addDecorator(withKnobs)
    .add("ToggleMenu", () => (
        <TogglableMenu
            toggle={<Button>Open</Button>}
            options={{
                Logout: () => console.log("out"),
                Login: () => console.log("in")
            }}
        />
    ))
    .add("Menu", () => {
        const [anchorTo, setAnchorTo] = React.useState<EventTarget | null>(null)
        return (
            <div>
                <button onClick={(e) => setAnchorTo(e.currentTarget)}>
                    Anchored here
                </button>
                <Menu
                    anchorTo={anchorTo}
                    open={booleanKnob("open", true)}
                    options={{
                        Logout: () => console.log("out"),
                        Login: () => console.log("in")
                    }}
                />
            </div>
        )
    })
