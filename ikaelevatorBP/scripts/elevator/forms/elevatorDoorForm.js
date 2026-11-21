import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import { ElevatorEntityBase } from "../elevatorBase";
import * as eUtils from "../../elevatorUtils";
import { moveMenu } from "./elevatorCommonForm";
import { ElevatorDoorEntity } from "../elevatorDoorEntity";

/**
 * 
 * @param {ElevatorDoorEntity} instance 
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
 * @param {ElevatorDoorEntity} instance 
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

/**
 * 
 * @param {ElevatorDoorEntity} instance 
 * @param {server.Player} player 
 */
export function showPaintDoorMenu(instance, player) {
    const paintMenu = new ui.ActionFormData();
    paintMenu.title("スタイル");
    const currentStyle = instance.getCurrentStyleID();
    for (const style of instance.styles) {
        const current = style === currentStyle;
        const texturePath = `textures/preview/${instance.id}/preview_elevator_${instance.id}_door_${style}.png`;
        const match = style.match(/^([a-zA-Z]+)(\d+)$/);
        const newText = `${match[1][0].toUpperCase()}${match[1].slice(1)} ${match[2]} ${current ? "(現在のスタイル)" : ""}`;
        paintMenu.button(newText, texturePath);
    }
    server.system.run(() => {
        paintMenu.show(player).then(res => {
            if (res.canceled) return;
            const currentIndex = instance.getCurrentStyle();
            if (res.selection === currentIndex) return;
            instance.setCurrentStyle(res.selection);
        });
    });
}