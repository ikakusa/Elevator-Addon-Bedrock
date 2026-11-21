import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import vec3 from "./vec3.js";
import * as utils from "./utils.js";
import * as Elevator from "./elevatorUtils.js";
import { ElevatorRegistry, Elevators } from "./elevatorRegistry.js";
import { ElevatorEntity } from "./elevator/elevatorEntity.js";
import { ElevatorSwitchEntity } from "./elevator/elevatorSwitchEntity.js";

server.world.afterEvents.entityLoad.subscribe(ev => {
    Elevators.tryAdd(ev.entity);
});

server.world.afterEvents.entitySpawn.subscribe(ev => {
    Elevators.tryAdd(ev.entity);
});

// retrieve elevatoe entts
server.system.run(() => {
    for (const dimId of ["overworld", "nether", "the_end"]) {
        //ドア以外のエンティティ
        const entities = server.world.getDimension(dimId).getEntities().filter(ent => Elevator.ELEVATOR_IDS.includes(ent.typeId));
        for (const entity of entities) {
            Elevators.tryAdd(entity);
        }
    }
    Elevators.initialized = true;
});

server.system.runInterval(() => {
    if (Elevators.initialized) Elevators.removeInvalid();
});

server.world.beforeEvents.playerInteractWithEntity.subscribe(ev => {
    const player = ev.player;
    const item = ev.itemStack;
    const entity = ev.target;

    const ent = Elevator.getMount(entity);
    switch (Elevator.getType(ent)) {
        case Elevator.TYPES.ELEVATOR_SWITCH:
        case Elevator.TYPES.ELEVATOR_DOOR:
        case Elevator.TYPES.ELEVATOR: {
            /**
             * @type {ElevatorEntity}
             */
            const instance = Elevators.tryGet(ent);
            if (!instance) return
            instance.interact(player, item);
        } break;
        default: {
        } break;
    }
});

server.world.beforeEvents.entityHurt.subscribe(ev => {
    if (ev.hurtEntity.typeId.includes("elevator:") && ev.damageSource.cause !== server.EntityDamageCause.selfDestruct) {
        ev.cancel = true;
        return;
    }
});

server.world.afterEvents.worldLoad.subscribe(() => {
    server.system.runInterval(() => {
        for (const [id, inst] of Elevators.maps) {
            /**
             * @type {ElevatorEntity}
             */
            const instance = inst;
            instance.tick();
        }
    });
});

//display
server.system.runInterval(() => {
    for (const player of server.world.getAllPlayers()) {
        const raycast = player.getEntitiesFromViewDirection({ maxDistance: 3 })[0];
        if (raycast && Elevator.getType(raycast.entity) === Elevator.TYPES.ELEVATOR_SWITCH) {
            const entt = raycast.entity;
            /**
             * @type {ElevatorSwitchEntity}
             */
            const instance = Elevators.tryGet(entt);
            if (!instance) continue;
            const floor = instance.getFloor();
            if (floor === -1) continue;
            if (!instance.getElevator()) continue;
            /**
             * @type {ElevatorEntity}
             */
            const elevatorInstance = Elevators.tryGet(server.world.getEntity(instance.getElevator()));
            if (!elevatorInstance) continue;

            let status = `${floor}階\n`;
            if (elevatorInstance.callQueue.floors.includes(elevatorInstance.floors.at(floor - 1))) {
                status += `呼び出し中 (${ elevatorInstance.isMoving() ? "移動中" : "停止中"})`;
            } else {
                status += `待機中`;
            }
            status += `\n現在${elevatorInstance.findClosestFloor() + 1}階`;
            player.onScreenDisplay.setActionBar(status);
        }
    }
}, 20);