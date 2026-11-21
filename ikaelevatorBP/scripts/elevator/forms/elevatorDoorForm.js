import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import { ElevatorEntityBase } from "../elevatorBase";
import * as eUtils from "../../elevatorUtils";
import { moveMenu } from "./elevatorCommonForm";

/**
 * 
 * @param {ElevatorEntityBase} instance 
 * @param {server.Player} player 
 */
export function showDeleteConfirm(instance, player) {
    server.system.run(() => {
        const menu = new ui.MessageFormData();
        menu.title("確認")
        menu.body("扉を撤去しますか？");
        menu.button1("はい");
        menu.button2("いいえ");
        menu.show(player).then(res => {
            if (res.canceled || res.selection === 1) return;
            eUtils.removeElevator(instance.entity);
        });
    });
}

/**
 * 
 * @param {ElevatorEntityBase} instance 
 * @param {server.Player} player 
 */
export function showManageDoorMenu(instance, player) {
    server.system.run(() => {
        const floor = instance.getFloor();
        const form = new ui.ActionFormData();
        form.title("管理メニュー");
        form.body(`エレベーター割り当て済: ${instance.getElevator() ? "はい" : "いいえ"}\n階層: ${floor && floor > 0 ? `${floor}` : "なし"}`);
        form.button("90度回転", "textures/icons/icon_rotate");
        form.button("移動", "textures/icons/icon_move");
        form.button("エレベーター割り当て", "textures/icons/icon_fix");
        form.button("削除", "textures/icons/icon_delete");
        form.show(player).then(res => {
            if (res.canceled) return;
            switch (res.selection) {
                case 0: { //90度回転
                    instance.entity.setRotation({ x: instance.entity.getRotation().x, y: instance.entity.getRotation().y + 90 });
                } break;
                case 1: { //移動
                    moveMenu(player, instance.entity);
                } break;
                case 2: {
                    player.setDynamicProperty("pending_elevator_door_id", instance.entity.id);
                    player.sendMessage("管理用アイテムを持ってエレベーターを右クリックして割り当て");
                } break;
                case 3: {
                    showDeleteConfirm(instance, player);
                } break;
                default: break;
            }
        });
    });
}