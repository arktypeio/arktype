import { deepFreeze } from "../utils/freeze.js"

export class Cache<item = unknown> {
    protected cache: { [name in string]?: item } = {}

    get root(): { readonly [name in string]?: item } {
        return this.cache
    }

    has(name: string) {
        return name in this.cache
    }

    get(name: string) {
        return this.cache[name]
    }

    set(name: string, item: item) {
        this.cache[name] = item
        return item
    }
}

export class FreezingCache<item = unknown> extends Cache<item> {
    override set(name: string, item: item) {
        this.cache[name] = deepFreeze(item) as item
        return item
    }
}
