import { Home } from "@material-ui/icons"
import React, { FC } from "react"
import { IconButton } from "redo-components"
import { store } from "renderer/common"
import { Page } from "renderer/state"

export type HomeButtonProps = {}

export const HomeButton: FC<HomeButtonProps> = ({}) => (
    <IconButton
        Icon={Home}
        style={{ color: "white" }}
        onClick={() => store.mutate({ page: Page.Home })}
    />
)
