import React from "react"
import { Button } from "../buttons"
import { Menu, TogglableMenu } from "."

export default {
    title: "Menus"
}

export const ToggleMenu = () => (
    <TogglableMenu
        toggle={<Button>Open</Button>}
        options={{
            Logout: () => console.log("out"),
            Login: () => console.log("in")
        }}
    />
)

export const StandardMenu = (props: any) => {
    const [anchorTo, setAnchorTo] = React.useState<EventTarget | null>(null)
    return (
        <div>
            <Button onClick={(e) => setAnchorTo(e.currentTarget)}>
                Anchored here
            </Button>
            <Menu
                anchorTo={anchorTo}
                options={{
                    Logout: () => console.log("out"),
                    Login: () => console.log("in")
                }}
                {...props}
            />
        </div>
    )
}

StandardMenu.argTypes = {
    open: { control: "boolean" }
}
