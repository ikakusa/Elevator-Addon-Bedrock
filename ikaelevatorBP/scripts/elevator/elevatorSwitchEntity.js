import * as server from "@minecraft/server";
import * as eUtils from "../elevatorUtils";
import { ElevatorEntityBase } from "./elevatorBase";
import { showSwitchManageMenu, showSwitchPaintMenu } from "./forms/elevatorSwitchForm";
import * as utils from "../utils";
import { ElevatorEntity } from "./elevatorEntity";

export class ElevatorSwitchEntity extends ElevatorEntityBase {
    /**
     * 
     * @param {server.Entity} entity 
     */
    constructor(entity, id, styles) {
        super(entity, eUtils.TYPES.ELEVATOR_SWITCH);
        /**
         * @type {number}
         */
        this.getFloor();
        this.getElevator();
        this.id = id;
        this.styles = styles
    }

    async interact(player, item) {
        if (eUtils.isManageItem(item)) {
            showSwitchManageMenu(this, player);
        } else if (eUtils.isPaintItem(item)) {
            showSwitchPaintMenu(this, player);
        } else {
            const { Elevators } = await import("../elevatorRegistry");
            if (!this.getElevator()) return;
            /**
             * @type {ElevatorEntity}
             */
            const instance = Elevators.tryGet(server.world.getEntity(this.getElevator()));
            if (!instance) return;

            const floors = instance.getFloors();
            const floor = floors.at(this.getFloor() - 1);
            if (!floor) return;
            if (instance.entity.location.y !== floor) { //do IT
                instance.addQueue(floor);
                server.system.run(() => {
                    this.entity.setProperty("property:on", true);
                });
            } else if (instance.entity.location.y === floor && !instance.isMoving()) {
                instance.setLastOpen(this.getFloor() - 1);
                instance.toggleDoor(player);
                instance.earlyOpenTimer(3000);
            }
        }
    }

    /**
     * 
     * @returns {string | undefined}
     */
    getElevator() {
        this.elevator = utils.getProperty(this.entity, "elevator", undefined);
        return this.elevator;
    }

    /**
     * @returns {number}
     */
    getFloor() {
        this.floor = utils.getProperty(this.entity, "floor", -1);
        return this.floor;
    }

    /**
     * 
     * @param {number} floor 
     */
    setFloor(floor) {
        this.entity.setDynamicProperty("floor", floor);
    }

    /**
     * 
     * @param {server.Entity} entity 
     */
    setElevator(entity) {
        if (eUtils.getType(entity) !== eUtils.TYPES.ELEVATOR) return;
        this.entity.setProperty("elevator", entity.id);
    }

    /** @returns {string} */      getCurrentStyleID() { return this.styles[this.entity.getProperty("property:style")]; }
    /** @returns {int} */         getCurrentStyle() { return this.entity.getProperty("property:style"); }
    /** @param {number} style  */ setCurrentStyle(style) { if (!this.styles[style]) return; this.entity.setProperty("property:style", style); }
}