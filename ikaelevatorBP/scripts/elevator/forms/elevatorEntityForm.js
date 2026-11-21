import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import * as utils from "../../utils";
import { ElevatorEntityBase } from "../elevatorBase";

/**
 * @param {ElevatorEntityBase} instance 
 * @param {sever.Player} player 
 */
export function showManageMenu(instance, player) {
    const ent = instance.entity;
    const pending = player.getDynamicProperty("pending_elevator_door_id");
    if (pending) {
        let floors = instance.floors;
        if (floors.isEmpty()) {
            player.sendMessage("先に階層を設定する必要があります");
            player.setDynamicProperty("pending_elevator_door_id", undefined);
            return;
        }
        const menu = new ui.ModalFormData();
        menu.title("割り当て");
        menu.label("階層を入力");
        menu.textField("階層", "数字を入れてください (例: 1)");
        server.system.run(() => {
            menu.show(player).then(async res => {
                if (res.canceled) {
                    player.setDynamicProperty("pending_elevator_door_id", undefined);
                    player.sendMessage("キャンセルしました");
                    return;
                }
                let value = parseInt(res.formValues[1]);
                if (isNaN(value)) {
                    player.sendMessage("階層は数値である必要があります");
                    return;
                }
                if (value < 1 || floors.floors.length < value) return player.sendMessage("階層が無効です");
                instance.addDoor(value - 1, pending);
                const { Elevators } = await import("../../elevatorRegistry");
                const doorInstance = Elevators.tryGet(server.world.getEntity(pending));
                if (!doorInstance) {
                    player.sendMessage("ドアが無効です");
                    player.setDynamicProperty("pending_elevator_door_id", undefined);
                    return;
                }
                doorInstance.setElevator(instance.entity.id);
                doorInstance.setFloor(value);
                player.sendMessage("扉を割り当てました");
                instance.applyStyleToChild();
            });
        });
        player.setDynamicProperty("pending_elevator_door_id", undefined);
        return;
    }
    const showMenu = () => {
        const menu = new ui.ActionFormData();
        menu.title("エレベーターの管理");
        menu.button("90度回転", "textures/icons/icon_rotate"); // 0
        menu.button("階層の一覧", "textures/icons/icon_list"); // 1
        menu.button("階層の追加", "textures/icons/icon_add"); // 2
        menu.button("階層の削除", "textures/icons/icon_remove"); // 3
        menu.button("詰まり解消", "textures/icons/icon_fix"); // 4
        menu.button("ドアの開閉", "textures/buttons/open"); //5
        menu.button("エレベーター本体を削除", "textures/icons/icon_delete"); // 6
        server.system.run(() => {
            menu.show(player).then(res => {
                if (res.canceled) return;
                let floors = instance.getFloors(); //y座標のリスト
                switch (res.selection) {
                    case 0: { //90度回転
                        ent.setRotation({ x: ent.getRotation().x, y: ent.getRotation().y + 90 });
                    } break;
                    case 1: { //リスト
                        const floorMenu = new ui.MessageFormData();
                        floorMenu.title(`階層リスト (${floors.length ?? 0}階層)`);
                        floorMenu.body(`${floors.floors.map((floor, i) => `${i + 1}階: Y${floor} ${ent.location.y === floor ? "<-- 今の階層" : ""}`).join("\n")}`);
                        floorMenu.button1("戻る");
                        floorMenu.button2("戻る");
                        floorMenu.show(player).then(res => {
                            return showMenu();
                        });
                    } break;
                    case 2: { //追加
                        const addMenu = new ui.ModalFormData();
                        addMenu.title("階層の追加");
                        addMenu.label("エレベーターの土台を基準とした高さにしてください");
                        addMenu.textField("Y座標", "y座標を入力 (例: 64)");
                        addMenu.show(player).then(res => {
                            if (res.canceled) return showMenu();
                            let value = parseInt(res.formValues[1]);
                            const range = player.dimension.heightRange;
                            if (isNaN(value)) {
                                player.sendMessage(`${range.min} ~ ${range.max} の範囲で入力してください`);
                                showMenu();
                                return;
                            }

                            value = Math.min(range.max, Math.max(range.min, value));
                            if (!instance.addFloor(value)) {
                                player.sendMessage("既に存在するまたは階層の数が５０を超えています");
                                showMenu();
                            }
                        });
                    } break;
                    case 3: { //階層を削除
                        const removeMenu = new ui.ModalFormData();
                        removeMenu.title("階層の削除");
                        removeMenu.label("エレベーターの階層を入力してください");
                        removeMenu.textField("階層", "階層を入力 (例: 2)");
                        removeMenu.show(player).then(res => {
                            if (res.canceled) return showMenu();
                            let value = parseInt(res.formValues[1]);
                            if (isNaN(value)) {
                                player.sendMessage(`階層を入力してください`);
                                showMenu();
                                return;
                            }

                            instance.removeFloor(value - 1);
                            return showMenu();
                        });
                    } break;
                    case 4: {
                        instance.setArriveTimer(0);
                        instance.setArriveFloor(false);
                        instance.setCanMove(true);
                        instance.setIsMoving(false);
                        instance.callQueue.floors = [];
                        instance.setOpenTimer(0);
                    } break;
                    case 5: {
                        instance.toggleDoor(player);
                        instance.earlyOpenTimer(3000);
                    } break;
                    case 6: { //削除
                        const confirm = new ui.MessageFormData();
                        confirm.title("確認");
                        confirm.body("エレベーターを削除しますか？");
                        confirm.button1("はい");
                        confirm.button2("いいえ");
                        confirm.show(player).then(res => {
                            if (res.canceled || res.selection !== 0) return showMenu();
                            instance.die();
                        });
                    } break;
                    default:
                        break;
                }
            });
        });
    };
    showMenu();
}

/**
 * 
 * @param {ElevatorEntityBase} instance 
 * @param {server.Player} player 
 */
export function showPaintMenu(instance, player) {
    const paintMenu = new ui.ActionFormData();
    paintMenu.title("スタイル");
    const currentStyle = instance.getCurrentStyleID();
    for (const style of instance.styles) {
        const current = style === currentStyle;
        const texturePath = `textures/preview/${instance.id}/preview_elevator_${instance.id}_${style}.png`;
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
            instance.applyStyleToChild();
        });
    });
}

/**
 * 
 * @param {ElevatorEntityBase} instance 
 * @param {server.Player} player 
 */
export function showFloorButtons(instance, player) {
    const form = new ui.ActionFormData();
    form.title(`§f§l§o§o§r${instance.findClosestFloor() + 1}`);
    for (let i = 0; i < instance.floors.floors.length; i++) {
        form.button(`§f§b§t§n §r${i + 1}階`, `textures/buttons/${i + 1}_${instance.callQueue.floors.includes(instance.floors.floors[i]) ? "on" : "off"}`);
    }

    if (instance.floors.floors.length % 2 !== 0)
        form.button(`§f§b§t§n`);

    form.button(`§f§b§t§n CLOSE`, "textures/buttons/close");
    form.button(`§f§b§t§n OPEN`, "textures/buttons/open");

    server.system.run(() => {
        form.show(player).then(res => {
            if (res.canceled) return;
            const selection = res.selection;
            const at = instance.floors.at(selection);
            if (instance.entity.location.y !== at)
                instance.addQueue(instance.floors.at(selection));

            if (selection >= instance.floors.floors.length && !utils.getProperty(instance.entity, "moving", false)) {
                switch (selection - instance.floors.floors.length) {
                    case 0: {
                        instance.closeDoor();
                    } break;
                    case 1: {
                        instance.openDoor();
                    } break;
                }
            }
        });
    });
}