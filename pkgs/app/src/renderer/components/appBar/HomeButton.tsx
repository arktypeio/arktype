import React from "react"
import { IconButton, Icons } from "@re-do/components"
import { store } from "renderer/common"
import { Page } from "renderer/state"

export const HomeButton = () => (
    <IconButton
        Icon={Icons.home}
        style={{ color: "white" }}
        onClick={() => store.mutate({ page: Page.Home })}
    />
)
