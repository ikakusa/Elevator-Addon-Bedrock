import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import * as eUtils from "../elevatorUtils";
import * as utils from "../utils";
import { ElevatorEntityBase } from "./elevatorBase";
import { Floors } from "./helper/floors";
import { Doors } from "./helper/doors";
import vec3 from "../vec3";
import { showFloorButtons, showManageMenu, showPaintMenu } from "./forms/elevatorEntityForm";

export class ElevatorEntity extends ElevatorEntityBase {
    /**
     * @param {server.Entity} entity 
     * @param {string} id
     * @param {string[]} styles  
     * @param {number} max_players
     * @param {number} collision_length
     * @param {...number} frontCollisions 
     */
    constructor(entity, id, styles, max_players, collision_length, ...frontCollisions) {
        super(entity, eUtils.TYPES.ELEVATOR);

        this.getDoors();
        this.getFloors();
        this.getCallQueue();

        this.collisions = entity.getComponent("rideable")?.getRiders().length;
        this.frontCollisions = frontCollisions;
        this.collision_length = collision_length;
        this.speed = 0.255;
        this.ySize = 3;

        this.capacity = max_players;

        this.id = id;
        this.styles = styles;
    }

    /**
     * @returns {boolean}
     */
    async tick() {
        if (!this.entity.isValid) return false;
        const elevator = this.entity;
        const available = this.canMove();
        const opened = this.isDoorOpen();
        const open_timer = this.getOpenTimer();

        if (opened && Date.now() - open_timer > 7000) {
            this.toggleDoor();
        }

        if (Date.now() - open_timer < 9250) return true;

        this.setCanMove(true);
        this.setArriveFloor(false);

        const q = this.callQueue;
        if (q.isEmpty() || !available || this.isOverWeight()) return true;
        this.setIsMoving(true);
        const currentY = elevator.location.y;
        let currentQ = q.floors[0];
        const diffY = currentY - currentQ;
        const isUp = diffY < 0;

        const aabb = this.entity.getAABB();
        const center = aabb.center;
        const loc = this.entity.location;

        const players = this.getPlayerInside();

        const nearBy = q.floors.filter(f => Math.abs(currentY - f) <= this.speed)[0];
        let arriveNearBy = false;
        if (nearBy && nearBy !== currentQ) {
            currentQ = nearBy;
            arriveNearBy = true;
        }
        if (arriveNearBy || Math.abs(diffY) <= this.speed) { //ついた
            players.forEach(player => {
                player.clearVelocity();
                player.applyImpulse({ x: 0, y: ((loc.y + this.speed) - loc.y) * 2, z: 0 });
            });
            elevator.teleport({ x: loc.x, y: currentQ, z: loc.z });

            this.entity.dimension.playSound("note.bell", this.entity.location);
            if (!opened)
                this.openDoor();
            this.setArriveTimer(Date.now());

            /**
             * @type {number[]}
             */
            let floors = this.floors.floors;
            const currentFloor = floors.indexOf(currentQ);

            const checkDoor = () => {
                if (currentFloor !== -1) {
                    const doors = this.doors.doors;
                    const door = doors[currentFloor];
                    if (!door) return;
                    const doorEnt = server.world.getEntity(door);
                    if (!doorEnt) return;
                    const doorOpen = utils.getProperty(doorEnt, "open", false);
                    if (!doorOpen) this.openDoor(doorEnt, doorEnt.getComponent("rideable")?.getRiders());
                }
            };
            checkDoor();

            this.setLastOpen(currentFloor);

            const { Elevators } = await import("../elevatorRegistry");
            Elevators.maps.forEach((ins, key) => {
                if (eUtils.getType(ins.entity) === eUtils.TYPES.ELEVATOR_SWITCH) {
                    const floorNum = this.floors.floors.indexOf(currentQ) + 1;
                    if (ins.getFloor() === floorNum) {
                        server.system.run(() => {
                            ins.entity.setProperty("property:on", false);
                        });
                    }
                }
            });

            if (!arriveNearBy)
                this.popQueue();
            else {
                this.callQueue.remove(this.callQueue.floors.indexOf(currentQ));
                this.saveCallQueue();
            }
            this.setCanMove(false);
            this.setArriveFloor(true);
            this.setIsMoving(false);

            for (const player of this.getRidingPlayers()) {
                const loc = player.location;
                player.runCommand("ride @s stop_riding");
                
                server.system.runTimeout(() => {
                    player.clearVelocity();
                    player.teleport({ x: loc.x, y: center.y + 1, z: loc.z });
                }, 1);
            }

            return true;
        }

        if (!this.canMove() || this.arriveFloor() || !this.isMoving()) return true;

        players.forEach(player => {
            if (!player.getComponent("riding")?.entityRidingOn) {
                player.runCommand(`ride @s start_riding @e[c=1,type=${this.entity.typeId}]`);
            }
        });

        const slowDistance = isUp ? 7 : 5
        const multiplier = Math.abs(diffY) < slowDistance ? Math.max(0.3, Math.min(1, Math.abs(diffY) / slowDistance)) : 1;
        const speedWithSlow = this.speed * multiplier;

        if (isUp) {
            elevator.teleport({ x: loc.x, y: loc.y + speedWithSlow, z: loc.z });
        } else {
            elevator.teleport({ x: loc.x, y: loc.y - speedWithSlow, z: loc.z });
        }
        return true;
    }

    /**
     * 
     * @param {server.Player} player 
     * @param {server.ItemStack} item 
     */
    interact(player, item) {
        const pendingSwitch = player.getDynamicProperty("pending_switch_id");
        if (pendingSwitch) {
            const switchEntity = server.world.getEntity(pendingSwitch);
            if (switchEntity && switchEntity.isValid) {
                switchEntity.setDynamicProperty("elevator", this.entity.id);
                player.setDynamicProperty("pending_switch_id", undefined);
                player.sendMessage("エレベーターを割り当てました");
                return;
            }
        }

        if (eUtils.isPaintItem(item)) {
            showPaintMenu(this, player);
            return;
        }

        if (eUtils.isManageItem(item)) { //管理
            showManageMenu(this, player);
            return;
        }

        //open and close
        if (this.isPlayerInside(player)) {
            if (!utils.getProperty(this.entity, "moving", false) && player.isSneaking) {
                this.toggleDoor(player, true);
                this.earlyOpenTimer(3000);
                return;
            }

            showFloorButtons(this, player);
        }
    }

    /**
     * @returns {boolean}
     */
    isOverWeight() {
        return this.getPlayerInside().length > this.capacity;
    }

    getRidingPlayers() {
        const rideable = this.entity.getComponent("rideable");
        return rideable.getRiders().filter(ent => ent.typeId === "minecraft:player");
    }

    /**
     * @returns {number} returns index
     */
    findClosestFloor() {
        if (this.floors.floors.length === 0) return undefined;
        const y = this.floors.floors.reduce((closest, current) => Math.abs(current - this.entity.location.y) < Math.abs(closest - this.entity.location.y) ? current : closest);
        return this.floors.floors.indexOf(y);
    }

    applyStyleToChild() {
        server.system.runTimeout(() => {
            const doors = this.doors;
            for (const [floor, door] of Object.entries(doors.doors)) {
                const ent = server.world.getEntity(door);
                if (ent && ent.isValid) {
                    ent.setProperty("property:style", this.getCurrentStyle());
                }
            }
        }, 1);
    }

    /** @returns {string} */      getCurrentStyleID() { return this.styles[this.entity.getProperty("property:style")]; }
    /** @returns {int} */         getCurrentStyle() { return this.entity.getProperty("property:style"); }
    /** @param {number} style  */ setCurrentStyle(style) { if (!this.styles[style]) return; this.entity.setProperty("property:style", style); }

    /** @returns {boolean}*/      isMoving() { return utils.getProperty(this.entity, "moving", false); }
    /** @returns {boolean} */     canMove() { return utils.getProperty(this.entity, "can_move", true); }
    /** @returns {boolean} */     arriveFloor() { return utils.getProperty(this.entity, "arrive_floor", false); }

    /** @returns {number} */      getOpenTimer() { return utils.getProperty(this.entity, "open_timer", 0); }
    /** @returns {number} */      getArriveTimer() { return utils.getProperty(this.entity, "arrive_timer", 0); }

    /**@param {boolean} value  */ setCanMove(value) { this.entity.setDynamicProperty("can_move", value) }
    /**@param {boolean} value  */ setIsMoving(value) { this.entity.setDynamicProperty("moving", value) }
    /** @param {boolean} value  */setArriveFloor(value) { this.entity.setDynamicProperty("arrive_floor", value) }

    /** @param {number} value  */ setArriveTimer(value) { this.entity.setDynamicProperty("arrive_timer", value) }
    /** @param {number} value  */ setOpenTimer(value) { this.entity.setDynamicProperty("open_timer", value) }
    /** @param {number} value  */ setArriveTimer(value) { this.entity.setDynamicProperty("arrive_timer", value) }

    /**
     * for initialize
     * @returns {Floors} //floors
     */
    getCallQueue() {
        this.callQueue = new Floors(JSON.parse(utils.getProperty(this.entity, "call_queue", "[]")));
        return this.callQueue;
    }

    saveCallQueue() {
        this.entity.setDynamicProperty("call_queue", JSON.stringify(this.callQueue.floors));
    }

    /**
     * 
     * @param {number} floor index 
     * @returns {boolean}
     */
    addQueue(floor) {
        const result = this.callQueue.add(floor);
        if (result) this.saveCallQueue();
        return result;
    }

    popQueue() {
        this.callQueue.remove(0);
        this.saveCallQueue();
    }

    /**
     * for initialize
     * @returns {Doors}
     */
    getDoors() {
        this.doors = new Doors(JSON.parse(utils.getProperty(this.entity, "elevator_doors", "{}")));
        return this.doors;
    }

    saveDoors() {
        this.entity.setDynamicProperty("elevator_doors", JSON.stringify(this.doors.doors));
    }

    /**
     * 
     * @param {number} index 
     * @param {string} doorEntityId 
     */
    addDoor(index, doorEntityId) {
        this.doors.update(index, doorEntityId);
        this.saveDoors();
    }

    /**
     * 
     * @param {number} index 
     */
    removeDoor(index) {
        this.doors.remove(index);
        this.saveDoors();
    }

    /**
     * for initialize
     * @returns {Floors}
     */
    getFloors() {
        this.floors = new Floors(JSON.parse(utils.getProperty(this.entity, "floors", "[]")));
        return this.floors;
    }

    saveFloors() {
        this.entity.setDynamicProperty("floors", JSON.stringify(this.floors.floors));
    }

    /**
     * 
     * @param {number} floorY y location 
     * @returns {boolean}
     */
    addFloor(floorY) {
        const result = this.floors.add(floorY);
        if (result) this.saveFloors();
        return result;
    }

    /**
     * 
     * @param {number} index starts 0 
     */
    removeFloor(index) {
        this.floors.remove(index);
        this.saveFloors();
    }

    /**
     * @returns {boolean}
     */
    isDoorOpen() {
        return utils.getProperty(this.entity, "open", false);
    }

    /**
     * @returns {number}
     */
    getLastOpen() {
        return utils.getProperty(this.entity, "last_open_floor", -1);
    }

    /**
     * 
     * @param {number} floor 
     */
    setLastOpen(floor) {
        this.entity.setDynamicProperty("last_open_floor", floor);
    }

    /**
     * @param {boolean} [all=false] returns all
     * @returns {server.Entity[]}
     */
    getFrontCollisions() {
        if (!this.entity.isValid) return;
        const rideable = this.entity.getComponent("rideable");
        return rideable?.getRiders().slice(this.frontCollisions[0], this.frontCollisions[1]);
    }

    /**
     * 
     * @param {server.Entity | null} other 
     * @param {server.Entity[]} [otherCollisions=null] 
     */
    openDoor(other = null, otherCollisions = null) {
        server.system.run(() => {
            const use = other ? other : this.entity;
            if (!use.isValid) return;
            const collisions = otherCollisions ? otherCollisions : this.getFrontCollisions();
            if (!collisions) return;
            collisions.forEach(c => c.triggerEvent("elevator_collision:no_collidable"));

            use.setDynamicProperty("open", true);
            use.setProperty("property:open", true);
            use.setDynamicProperty("open_timer", Date.now());

            //parent door
            const last_open = this.getLastOpen();
            if (last_open === -1) return;
            const door = this.doors.doors[last_open];
            if (!door) return;
            const doorEnt = server.world.getEntity(door);
            if (!doorEnt) return;
            const colls = doorEnt.getComponent("rideable")?.getRiders();
            const doorOpen = utils.getProperty(doorEnt, "open", false);
            if (!doorOpen) this.openDoor(doorEnt, colls);
        });
    }
    /**
     * 
     * @param {server.Entity | null} other 
     * @param {server.Entity[]} [otherCollisions=null] 
     */
    closeDoor(other = null, otherCollisions = null) {
        server.system.run(() => {
            if (this.isOverWeight()) return;
            const use = other ? other : this.entity;
            if (!use.isValid) return;
            const collisions = otherCollisions ? otherCollisions : this.getFrontCollisions();
            if (!collisions) return;
            collisions.forEach(c => c.triggerEvent("elevator_collision:collidable"));

            use.setDynamicProperty("open", false);
            use.setProperty("property:open", false);
            use.setDynamicProperty("open_timer", Date.now());

            //parent door
            const last_open = this.getLastOpen();
            if (last_open === -1) return;
            const door = this.doors.doors[last_open];
            if (!door) return;
            const doorEnt = server.world.getEntity(door);
            if (!doorEnt) return;
            const colls = doorEnt.getComponent("rideable")?.getRiders();
            const doorOpen = utils.getProperty(doorEnt, "open", false);
            if (doorOpen) this.closeDoor(doorEnt, colls);
        });
    }

    /**
     * @param {number} milliseconds 
     */
    earlyOpenTimer(milliseconds, other = null) {
        const use = other ? other : this.entity;
        const current = utils.getProperty(use, "open_timer", 0);
        use.setDynamicProperty("open_timer", current - milliseconds);
    }

    /**
     * @returns {server.Player[]}
     */
    getPlayerInside() {
        const aabb = this.entity.getAABB();
        const center = aabb.center;
        const size = aabb.extent;
        const loc = this.entity.location;
        const boxMin = new vec3(center.x - size.x, center.y - size.y, center.z - size.z);
        const boxMax = new vec3(center.x + size.x, center.y + size.y + this.ySize + ((loc.y + this.speed) - loc.y), center.z + size.z);
        return this.entity.dimension.getPlayers().filter(player => vec3.from(player.location).isInRange(boxMin, boxMax));
    }

    /**
     * 
     * @param {server.Player} player 
     */
    isPlayerInside(player) {
        return this.getPlayerInside().includes(player);
    }

    /**
     * @param {server.Player} player 
     * @param {boolean} insideCheck checks player is inside of the elevator 
     */
    toggleDoor(player = null, insideCheck = false) {
        if (!this.entity.isValid) return;
        let pass = !insideCheck;
        if (insideCheck) {
            pass = this.isPlayerInside(player) && !utils.getProperty(this.entity, "moving", false) && player.isSneaking;
        }

        if (pass) {
            const opened = this.isDoorOpen();
            if (!opened)
                this.openDoor();
            else
                this.closeDoor();
        }
    }
}