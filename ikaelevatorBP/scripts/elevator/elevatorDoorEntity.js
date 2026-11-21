import * as server from "@minecraft/server";
import * as eUtils from "../elevatorUtils";
import { ElevatorEntityBase } from "./elevatorBase";
import { showSwitchManageMenu, showSwitchPaintMenu } from "./forms/elevatorSwitchForm";
import { ElevatorEntity } from "./elevatorEntity";
import { showDeleteConfirm, showManageDoorMenu } from "./forms/elevatorDoorForm";
import * as utils from "../utils";

export class ElevatorDoorEntity extends ElevatorEntityBase {
    /**
     * 
     * @param {server.Entity} entity 
     */
    constructor(entity, id, styles) {
        super(entity, eUtils.TYPES.ELEVATOR_DOOR);
        this.id = id;
        this.styles = styles
        this.getElevator();
        this.getFloor();
    }
    
    getElevator() {
        this.elevator = utils.getProperty(this.entity, "elevator", undefined);
        return this.elevator;
    }

    /**
     * 
     * @param {string} id 
     */
    setElevator(id) {
        this.elevator = id;
        this.entity.setDynamicProperty("elevator", this.elevator);
    }

    getFloor() {
        this.floor = utils.getProperty(this.entity, "floor", undefined);
        return this.floor;
    }

    /**
     * 
     * @param {number} floor 
     */
    setFloor(floor) {
        this.floor = floor;
        this.entity.setDynamicProperty("floor", this.floor);
    }

    /**
     * 
     * @param {server.Player} player 
     * @param {server.ItemStack} item 
     * @returns 
     */
    async interact(player, item) {
        if (eUtils.isManageItem(item)) {
            showManageDoorMenu(this, player);
        }
    }

    /** @returns {string} */      getCurrentStyleID() { return this.styles[this.entity.getProperty("property:style")]; }
    /** @returns {int} */         getCurrentStyle() { return this.entity.getProperty("property:style"); }
    /** @param {number} style  */ setCurrentStyle(style) { if (!this.styles[style]) return; this.entity.setProperty("property:style", style); }
}