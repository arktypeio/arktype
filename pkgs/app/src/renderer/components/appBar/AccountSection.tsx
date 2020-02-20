import React from "react"
import { IconButton, TogglableMenu, Icons } from "@re-do/components"
import { store } from "renderer/common"

export const AccountSection = ({}) => {
    return (
        <>
            <IconButton Icon={Icons.help} style={{ color: "white" }} />
            <TogglableMenu>
                {{
                    toggle: (
                        <IconButton
                            Icon={Icons.account}
                            style={{ color: "white" }}
                        />
                    ),
                    options: {
                        Logout: () => store.mutate({ token: "" })
                    }
                }}
            </TogglableMenu>
        </>
    )
}
