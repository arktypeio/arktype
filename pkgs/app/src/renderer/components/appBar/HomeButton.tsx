import React from "react"
import { Button, Icons } from "@re-do/components"
import { store } from "renderer/common"

export const HomeButton = () => (
    <Button
        Icon={Icons.home}
        style={{ color: "white" }}
        onClick={() => store.update({ page: "HOME" })}
    />
)
