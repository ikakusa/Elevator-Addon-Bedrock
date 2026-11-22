import * as server from "@minecraft/server";
import { ElevatorEntityBase } from "./elevator/elevatorBase";
import * as eUtils from "./elevatorUtils";
import { ElevatorSwitchEntity } from "./elevator/elevatorSwitchEntity";
import { ElevatorEntity } from "./elevator/elevatorEntity";
import * as ETYPES from "./elevatorTypes";
import { ElevatorDoorEntity } from "./elevator/elevatorDoorEntity";

export class ElevatorRegistry {
    constructor() {
        /**
         * @type {Map<string, ElevatorEntityBase>}
         */
        this.maps = new Map();
        this.initialized = false;
    }

    /**
     * @param {server.Entity} entity
     */
    createInstance(entity) {
        if (!eUtils.ELEVATOR_IDS.includes(entity.typeId)) return undefined;
        if (!entity.typeId.startsWith(eUtils.ELEVATOR_BASE_ID)) return undefined;

        if (new RegExp(`${eUtils.ELEVATOR_BASE_ID}\\d+$`).test(entity.typeId)) { //elevator
            let frontIndex = [3, 5]; //basically type1 2x2 elevator
            let styles = ["style_0"]; //デフォルトスタイル
            let capacity = 8;
            let collisions = 14;
            let id = entity.typeId.match(new RegExp(`(?<=_)type\\d+`))[0];
            switch (entity.typeId) {
                case ETYPES.ELEVATOR_TYPE2:
                case ETYPES.ELEVATOR_TYPE1: {
                    styles = [
                        "style0",
                        "style1"
                    ];
                } break;
                default: break;
            }
            return new ElevatorEntity(entity, id, styles, capacity, collisions, ...frontIndex);
        } else if (new RegExp(`${eUtils.ELEVATOR_BASE_ID}\\d+_switch$`).test(entity.typeId)) { //switch
            let styles = ["style_0"] //デフォルト
            let id = entity.typeId.match(new RegExp(`(?<=_)type\\d+`))[0];
            switch (entity.typeId) {
                case ETYPES.ELEVATOR_TYPE1_SWITCH: {
                    styles = [
                        "style0",
                        "style1"
                    ]
                } break;
                default: break;
            }
            return new ElevatorSwitchEntity(entity, id, styles);
        } else if (new RegExp(`${eUtils.ELEVATOR_BASE_ID}\\d+_door$`).test(entity.typeId)) { //ドア
            let styles = ["style_0"] //デフォルト
            let id = entity.typeId.match(new RegExp(`(?<=_)type\\d+`))[0];
            switch (entity.typeId) {
                case ETYPES.ELEVATOR_TYPE2_DOOR:
                case ETYPES.ELEVATOR_TYPE1_DOOR: {
                    styles = [
                        "style0",
                        "style1"
                    ]
                } break;
                default: break;
            }
            return new ElevatorDoorEntity(entity, id, styles);
        }
    }

    /**
     * 
     * @param {server.Entity} entity 
     */
    tryAdd(entity) {
        if (!this.maps.has(entity.id)) {
            const instance = this.createInstance(entity);
            if (instance) this.maps.set(entity.id, instance);
        }
    }

    /**
     * 
     * @param {server.Entity} entity 
     * @returns {ElevatorEntityBase | undefined}
     */
    tryGet(entity) {
        if (!entity) return;
        if (!entity.isValid) return;
        const value = this.maps.get(entity.id);
        if (!value || !value.entity.isValid) return undefined;
        return this.maps.get(entity.id);
    }

    removeInvalid() {
        for (const [id, instance] of this.maps) {
            if (!instance.entity.isValid) {
                this.maps.delete(id);
            }
        }
    }
}

export const Elevators = new ElevatorRegistry();