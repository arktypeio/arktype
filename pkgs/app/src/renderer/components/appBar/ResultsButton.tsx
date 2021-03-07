import React from "react"
import { Button, Icons } from "@re-do/components"
import { store } from "renderer/common"
import { Page } from "state"

export const ResultsButton = () => (
    <Button
        Icon={Icons.view}
        style={{ color: "white" }}
        onClick={() => store.update({ page: Page.Results })}
    />
)
