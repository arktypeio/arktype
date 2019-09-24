import React from "react"
import { Icons } from "@re-do/components"
import { TypeAction } from "@re-do/model"

type ActionToButton = { [_ in NonNullable<TypeAction>]: React.ComponentType }

export const actionToIcon: ActionToButton = {
    DELETE: Icons.trash,
    UPDATE: Icons.edit,
    RUN: Icons.run
}
