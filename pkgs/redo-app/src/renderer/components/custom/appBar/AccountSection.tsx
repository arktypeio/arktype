import { HelpOutline, Person } from "@material-ui/icons"
import React, { FC } from "react"
import { IconButton } from "redo-components"
import { store } from "renderer/common"
import { Menu } from "redo-components"

export type AccountSectionProps = {}

export const AccountSection: FC<AccountSectionProps> = ({}) => {
    return (
        <>
            <IconButton Icon={HelpOutline} style={{ color: "white" }} />
            <Menu>
                {{
                    toggle: (
                        <IconButton Icon={Person} style={{ color: "white" }} />
                    ),
                    options: {
                        Logout: () => store.mutate({ token: "" })
                    }
                }}
            </Menu>
        </>
    )
}
