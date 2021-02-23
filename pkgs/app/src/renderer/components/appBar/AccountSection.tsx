import React from "react"
import { Button, TogglableMenu, Icons } from "@re-do/components"
import { store } from "renderer/common"

export const AccountSection = ({}) => {
    return (
        <>
            <Button Icon={Icons.help} style={{ color: "white" }} />
            <TogglableMenu
                toggle={
                    <Button Icon={Icons.account} style={{ color: "white" }} />
                }
                options={{
                    Logout: () => store.mutate({ token: "" })
                }}
            />
        </>
    )
}
