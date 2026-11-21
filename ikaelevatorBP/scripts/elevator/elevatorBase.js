import * as server from "@minecraft/server";
import * as eUtils from "../elevatorUtils";

export class ElevatorEntityBase {
    /**
     * 
     * @param {server.Entity} entity
     * @param {number} type 
     */
    constructor(entity, type) {
        if (!entity.isValid) throw new Error("Entity is not valid")
        /**
         * @type {server.Entity}
         */
        this.entity = entity;
        /**
         * @type {number}
         */
        this.type = type;
    }

    /**
     * @returns {boolean}
     */
    tick() {
        if (!this.entity.isValid) return false;
    }
    die() {
        if (!this.entity.isValid) return;
        const riding = this.entity.getComponent("rideable")?.getRiders();
        riding?.forEach(ride => ride.triggerEvent("elevator_collision:despawn"));
        this.entity.kill();
    }

    /**
     * @returns {boolean}
     */
    isElevator() {
        return this.type === eUtils.TYPES.ELEVATOR;
    }
    /**
     * @returns {boolean}
     */
    isDoor() {
        return this.type === eUtils.TYPES.ELEVATOR_DOOR;
    }
    /**
     * @returns {boolean}
     */
    isSwitch() {
        return this.type === eUtils.TYPES.ELEVATOR_SWITCH;
    }
}