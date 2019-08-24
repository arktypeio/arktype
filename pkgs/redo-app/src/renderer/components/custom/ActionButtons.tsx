import React from "react"
import { IconButton, Icons } from "redo-components"
import { TypeAction } from "redo-model"

type ActionToButton = { [_ in NonNullable<TypeAction>]: React.ComponentType }

export const actionToIcon: ActionToButton = {
    DELETE: Icons.trash,
    UPDATE: Icons.edit,
    RUN: Icons.run
}
