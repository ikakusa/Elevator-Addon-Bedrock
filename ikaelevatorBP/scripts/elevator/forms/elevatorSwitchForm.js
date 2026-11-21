import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import { ElevatorEntityBase } from "../elevatorBase";
import * as eUtils from "../../elevatorUtils"

/**
 * 
 * @param {ElevatorEntityBase} instance 
 * @param {server.Player} player 
 */
export function showSwitchPaintMenu(instance, player) {
    const paintMenu = new ui.ActionFormData();
    paintMenu.title("スタイル");
    const currentStyle = instance.getCurrentStyleID();
    for (const style of instance.styles) {
        const current = style === currentStyle;
        const texturePath = `textures/preview/switch_${instance.id}/preview_elevator_${instance.id}_switch_${style}.png`;
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

/**
 * 
 * @param {ElevatorEntityBase} instance 
 * @param {server.Player} player 
 */
export function showSwitchManageMenu(instance, player) {
    const manageMenu = new ui.ActionFormData();
    manageMenu.title("管理");
    manageMenu.body(`割り当て階層: ${instance.getFloor() === -1 ? "なし" : instance.getFloor()}\nエレベーター割り当て済み: ${instance.getElevator() !== undefined ? "はい" : "いいえ"}`);
    manageMenu.button("階層割り当て", "textures/icons/icon_add");
    manageMenu.button("エレベーター割り当て", "textures/icons/icon_fix");
    manageMenu.button("削除", "textures/icons/icon_delete");

    server.system.run(() => {
        manageMenu.show(player).then(res => {
            if (res.canceled) return;
            switch (res.selection) {
                case 0: {
                    const form = new ui.ModalFormData();
                    form.title("階層割り当て");
                    form.textField("階層を入力", "数字を入力してください (例: 1");
                    form.show(player).then(res => {
                        if (res.canceled) return;
                        const value = parseInt(res.formValues[0]);
                        if (isNaN(value)) {
                            player.sendMessage("数値を入力してください");
                            return;                            
                        }

                        instance.setFloor(value);
                        showSwitchManageMenu(instance, player);
                    });
                } break;
                case 1: {
                    player.setDynamicProperty("pending_switch_id", instance.entity.id);
                    player.sendMessage("エレベーターを右クリックして割り当てしてください");
                } break;
                case 2: {
                    const confirm = new ui.MessageFormData();
                    confirm.title("確認");
                    confirm.body("スイッチを削除しますか？");
                    confirm.button1("はい");
                    confirm.button2("いいえ");
                    confirm.show(player).then(res => {
                        if (res.canceled || res.selection !== 0) return;
                        eUtils.removeElevator(instance.entity);                    
                    });
                }
                default: break;
            }
        });
    });
}

/**
 * 
 * @param {ElevatorEntityBase} instance 
 * @param {server.Player} player 
 */
export function showConfirmCancelAttach(instance, player) {
    const menu = new ui.MessageFormData();
    menu.title("確認");
    menu.button1("はい");
    menu.button2("いいえ");
    menu.body("エレベーターの割り当て処理をキャンセルしますか？");
    server.system.run(() => {
        menu.show(player).then(res => {
            if (res.canceled || res.selection !== 0) return;
            player.setDynamicProperty("pending_switch_id", undefined);
            player.sendMessage("割り当てをキャンセルしました");
        });
    });
}