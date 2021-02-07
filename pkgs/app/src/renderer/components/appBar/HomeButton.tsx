import React from "react"
import { Button, Icons } from "@re-do/components"
import { store } from "renderer/common"
import { Page } from "renderer/state"

export const HomeButton = () => (
    <Button
        Icon={Icons.home}
        style={{ color: "white" }}
        onClick={() => store.mutate({ page: Page.Home })}
    />
)
