import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import * as ELEVATOR_TYPES from "./elevatorTypes";

export const MANAGE_ITEM_ID = "elevator:spanner";
export const PAINT_ITEM_ID = "elevator:brush";

export const ELEVATOR_BASE_ID = "elevator:elevator_type";

export const ELEVATOR_IDS = [
    //type1
    ELEVATOR_TYPES.ELEVATOR_TYPE1,
    ELEVATOR_TYPES.ELEVATOR_TYPE1_DOOR,
    ELEVATOR_TYPES.ELEVATOR_TYPE1_SWITCH,

    //type2
    ELEVATOR_TYPES.ELEVATOR_TYPE2,
    ELEVATOR_TYPES.ELEVATOR_TYPE2_DOOR
];

export const TYPES = Object.freeze({
    NOT_AN_ELEVATOR: 0,
    ELEVATOR: 1,
    ELEVATOR_DOOR: 2,
    ELEVATOR_SWITCH: 3,
    ELEVATOR_COLLISION: 4
});

/**
 * 
 * @param {server.ItemStack} item 
 */
export function isManageItem(item) {
    return item && item.typeId === MANAGE_ITEM_ID;
}

/**
 * 
 * @param {server.ItemStack} item 
 */
export function isPaintItem(item) {
    return item && item.typeId === PAINT_ITEM_ID;
}

/**
 * 
 * @param {server.Entity} ent 
 */
export function getType(ent) {
    const family = ent?.getComponent("type_family");
    if (!family) return TYPES.NOT_AN_ELEVATOR;
    if (family.hasTypeFamily("elevator"))
        return TYPES.ELEVATOR;
    else if (family.hasTypeFamily("elevator_collision"))
        return TYPES.ELEVATOR_COLLISION;
    else if (family.hasTypeFamily("elevator_door"))
        return TYPES.ELEVATOR_DOOR;
    else if (family.hasTypeFamily("elevator_switch"))
        return TYPES.ELEVATOR_SWITCH;
    return TYPES.NOT_AN_ELEVATOR;
}

/**
 * 
 * @param {server.Entity} ent 
 * @param {number} type 
 */
export function is(ent, type) {
    return type === getType(ent, type);
}

/**
 * 
 * @param {server.Entity} ent 
 * @param {...number} types
 */
export function anyOf(ent, ...types) {
    return types.some(type => is(ent, type));
}

/**
 * 
 * @param {server.Entity} ent 
 * @param {number} type 
 */
export function orCollision(ent, type) {
    return anyOf(ent, type, TYPES.ELEVATOR_COLLISION);
}

/**
 * 
 * @param {server.Entity} ent 
 */
export function removeElevator(ent) {
    if (!anyOf(ent, TYPES.ELEVATOR, TYPES.ELEVATOR_DOOR, TYPES.ELEVATOR_SWITCH)) return;
    const riding = ent.getComponent("rideable")?.getRiders();
    riding?.forEach(ride => ride.triggerEvent("elevator_collision:despawn"));
    ent.kill();
}

/**
 * @param {server.Entity} ent 
 */
export function getMount(ent) {
    if (!anyOf(ent, TYPES.ELEVATOR_COLLISION, TYPES.ELEVATOR_DOOR, TYPES.ELEVATOR_SWITCH, TYPES.ELEVATOR)) return undefined;
    const riding = ent.getComponent("riding");
    if (riding) {
        return riding.entityRidingOn;
    }
    return ent;
}