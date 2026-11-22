import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";

/**
 * 
 * @param {server.Player} player 
 * @param {server.Entity} ent
 */
export function moveMenu(player, ent) {
    const modal = new ui.ModalFormData();
    modal.title("移動");
    modal.dropdown("方向", ["右", "左", "前", "後ろ", "上", "下"]);
    modal.show(player).then(res => {
        if (res.canceled) return;
        const dropdown = res.formValues[0];
        switch (dropdown) {
            case 0: {
                ent.runCommand("tp @s ^1^^");
            } break;
            case 1: {
                ent.runCommand("tp @s ^-1^^");
            } break;
            case 2: {
                ent.runCommand("tp @s ^^^-1");
            } break;
            case 3: {
                ent.runCommand("tp @s ^^^1");
            } break;
            case 4: {
                ent.runCommand("tp @s ^^1^");
            } break;
            case 5: {
                ent.runCommand("tp @s ^^-1^");
            } break;
            default: break;
        }
    });
}