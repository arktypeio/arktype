import React, { FC } from "react"
import { IconButton, Icons } from "redo-components"
import { store } from "renderer/common"
import { Page } from "renderer/state"

export type HomeButtonProps = {}

export const HomeButton: FC<HomeButtonProps> = ({}) => (
    <IconButton
        Icon={Icons.home}
        style={{ color: "white" }}
        onClick={() => store.mutate({ page: Page.Home })}
    />
)
