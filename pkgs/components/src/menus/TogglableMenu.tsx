import React, { cloneElement, useState, MouseEvent } from "react"
import { MenuOptions, MenuProps, Menu } from "./Menu"

export type TogglableMenuProps = Partial<Omit<MenuProps, "children">> & {
    children: {
        toggle: JSX.Element
        options: MenuOptions
    }
}

export const TogglableMenu = ({ children, ...rest }: TogglableMenuProps) => {
    const [anchorRef, setAnchorRef] = useState<HTMLElement | null>(null)
    const anchorComponent = cloneElement(children.toggle, {
        onClick: (e: MouseEvent<HTMLButtonElement>) => {
            setAnchorRef(e.currentTarget)
        }
    })
    return (
        <>
            {anchorComponent}
            <Menu {...rest}>
                {{
                    anchorTo: { current: anchorRef },
                    onClickAway: () => setAnchorRef(null),
                    onSelectItem: () => setAnchorRef(null),
                    open: !!anchorRef,
                    options: children.options
                }}
            </Menu>
        </>
    )
}
