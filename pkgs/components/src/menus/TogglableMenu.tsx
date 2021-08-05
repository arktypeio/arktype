import React, { cloneElement, useState, MouseEvent } from "react"
import { MenuOptions, Menu } from "./Menu.js"
import { PopperProps as MuiPopperProps } from "@material-ui/core/Popper"

export type TogglableMenuProps = Partial<MuiPopperProps> & {
    toggle: JSX.Element
    options: MenuOptions
}

export const TogglableMenu = ({
    toggle,
    options,
    ...rest
}: TogglableMenuProps) => {
    const [anchorRef, setAnchorRef] = useState<HTMLElement | null>(null)
    const anchorComponent = cloneElement(toggle, {
        onClick: (e: MouseEvent<HTMLButtonElement>) => {
            setAnchorRef(e.currentTarget)
        }
    })
    return (
        <>
            {anchorComponent}
            <Menu
                anchorTo={anchorRef}
                onClickAway={() => setAnchorRef(null)}
                onSelectItem={() => setAnchorRef(null)}
                open={!!anchorRef}
                options={options}
                {...rest}
            />
        </>
    )
}
