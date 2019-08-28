import React, { FC } from "react"
import { IconButton, Menu, Icons } from "@re-do/components"
import { store } from "renderer/common"

export type AccountSectionProps = {}

export const AccountSection: FC<AccountSectionProps> = ({}) => {
    return (
        <>
            <IconButton Icon={Icons.help} style={{ color: "white" }} />
            <Menu>
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
            </Menu>
        </>
    )
}
