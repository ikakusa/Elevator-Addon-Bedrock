import * as server from "@minecraft/server";

/**
 * @param {server.Player | server.ItemStack | server.World | server.Block | server.Entity} target
 * @param {string} name 
 * @param {string | number | boolean | Object | undefined} initial
 * */
export function getProperty(target, name, initial = undefined) {
    let value = target.getDynamicProperty(name);
    if (value === undefined) {
        target.setDynamicProperty(name, initial);
        value = initial;
    }
    return value;
}
