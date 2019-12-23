import React from "react"
import { IconButton, Icons } from "@re-do/components"
import { store } from "renderer/common"
import { Page } from "renderer/state"

export const ResultsButton = () => (
    <IconButton
        Icon={Icons.view}
        style={{ color: "white" }}
        onClick={() => store.mutate({ page: Page.Results })}
    />
)
