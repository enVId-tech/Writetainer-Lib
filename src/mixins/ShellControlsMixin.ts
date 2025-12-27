import type { Constructor } from "../types.ts";

export function ShellControlsMixin<TBase extends Constructor>(Base: TBase) {
    return class extends Base {

    }
}