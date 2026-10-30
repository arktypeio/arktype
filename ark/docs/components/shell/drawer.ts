import { useSyncExternalStore } from "react"

// the drawer's open state, shared by the menu button in the top nav and the
// drawer itself, which render in different parts of the tree
let open = false
const listeners = new Set<() => void>()

export const setDrawerOpen = (value: boolean): void => {
	if (value === open) return
	open = value
	for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
	listeners.add(listener)
	return () => void listeners.delete(listener)
}

export const useDrawerOpen = (): boolean =>
	useSyncExternalStore(
		subscribe,
		() => open,
		() => false
	)

export const menuButtonId = "drawer-toggle"
