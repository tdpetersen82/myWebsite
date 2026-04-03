import * as THREE from 'three';

export class BoardBuilder {
    constructor(scene, level) {
        this.scene = scene;
        this.level = level;
        this.group = new THREE.Group();
        this.holeMeshes = [];
        this.startPos = null;
        this.goalPos = null;

        this.build();
        scene.add(this.group);
    }

    cellToWorld(row, col) {
        const totalW = this.level.cols * CONFIG.CELL_SIZE;
        const totalH = this.level.rows * CONFIG.CELL_SIZE;
        const x = col * CONFIG.CELL_SIZE - totalW / 2 + CONFIG.CELL_SIZE / 2;
        const z = row * CONFIG.CELL_SIZE - totalH / 2 + CONFIG.CELL_SIZE / 2;
        return { x, z };
    }

    build() {
        const { rows, cols } = this.level;
        const totalW = cols * CONFIG.CELL_SIZE;
        const totalH = rows * CONFIG.CELL_SIZE;
        const cs = CONFIG.CELL_SIZE;

        // Board base
        const boardGeo = new THREE.BoxGeometry(totalW + 1, CONFIG.BOARD_THICKNESS, totalH + 1);
        const boardMat = new THREE.MeshStandardMaterial({ color: CONFIG.BOARD_COLOR, roughness: 0.7 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.y = -CONFIG.BOARD_THICKNESS / 2;
        board.receiveShadow = true;
        this.group.add(board);

        // Dark floor under holes area
        const floorGeo = new THREE.BoxGeometry(totalW, 0.01, totalH);
        const floorMat = new THREE.MeshStandardMaterial({ color: CONFIG.FLOOR_COLOR });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -CONFIG.BOARD_THICKNESS + 0.01;
        this.group.add(floor);

        // Rim walls (N, S, E, W)
        const rimMat = new THREE.MeshStandardMaterial({ color: CONFIG.RIM_COLOR, roughness: 0.6 });
        const rimH = CONFIG.RIM_HEIGHT;
        const rimT = CONFIG.WALL_THICKNESS * 2;
        const rims = [
            { w: totalW + rimT * 2, d: rimT, x: 0, z: -totalH / 2 - rimT / 2 }, // north
            { w: totalW + rimT * 2, d: rimT, x: 0, z: totalH / 2 + rimT / 2 },  // south
            { w: rimT, d: totalH, x: -totalW / 2 - rimT / 2, z: 0 },             // west
            { w: rimT, d: totalH, x: totalW / 2 + rimT / 2, z: 0 },              // east
        ];
        for (const r of rims) {
            const geo = new THREE.BoxGeometry(r.w, rimH, r.d);
            const mesh = new THREE.Mesh(geo, rimMat);
            mesh.position.set(r.x, rimH / 2, r.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.group.add(mesh);
        }

        // Interior walls
        const wallMat = new THREE.MeshStandardMaterial({ color: CONFIG.WALL_COLOR, roughness: 0.5 });
        const wh = CONFIG.WALL_HEIGHT;
        const wt = CONFIG.WALL_THICKNESS;

        for (const [row, col, side] of this.level.walls) {
            const { x, z } = this.cellToWorld(row, col);
            let wx, wz, ww, wd;

            if (side === 's') {
                wx = x;
                wz = z + cs / 2;
                ww = cs + wt;
                wd = wt;
            } else if (side === 'n') {
                wx = x;
                wz = z - cs / 2;
                ww = cs + wt;
                wd = wt;
            } else if (side === 'e') {
                wx = x + cs / 2;
                wz = z;
                ww = wt;
                wd = cs + wt;
            } else { // 'w'
                wx = x - cs / 2;
                wz = z;
                ww = wt;
                wd = cs + wt;
            }

            const geo = new THREE.BoxGeometry(ww, wh, wd);
            const mesh = new THREE.Mesh(geo, wallMat);
            mesh.position.set(wx, wh / 2, wz);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.group.add(mesh);
        }

        // Cells: holes, start, goal
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellType = this.level.cells[r][c];
                const { x, z } = this.cellToWorld(r, c);

                if (cellType === 1) {
                    // Hole
                    const holeGeo = new THREE.CylinderGeometry(CONFIG.HOLE_RADIUS, CONFIG.HOLE_RADIUS, CONFIG.BOARD_THICKNESS + 0.1, 24);
                    const holeMat = new THREE.MeshStandardMaterial({ color: CONFIG.HOLE_COLOR });
                    const hole = new THREE.Mesh(holeGeo, holeMat);
                    hole.position.set(x, -0.05, z);
                    this.group.add(hole);
                    this.holeMeshes.push(hole);
                } else if (cellType === 2) {
                    // Start marker
                    const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 24);
                    const mat = new THREE.MeshStandardMaterial({ color: CONFIG.START_COLOR, emissive: CONFIG.START_COLOR, emissiveIntensity: 0.3 });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(x, 0.03, z);
                    this.group.add(mesh);
                    this.startPos = { x, z };
                } else if (cellType === 3) {
                    // Goal marker
                    const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 24);
                    const mat = new THREE.MeshStandardMaterial({ color: CONFIG.GOAL_COLOR, emissive: CONFIG.GOAL_COLOR, emissiveIntensity: 0.5 });
                    this.goalMesh = new THREE.Mesh(geo, mat);
                    this.goalMesh.position.set(x, 0.03, z);
                    this.group.add(this.goalMesh);
                    this.goalPos = { x, z };
                }
            }
        }
    }

    update(time) {
        // Pulse goal marker
        if (this.goalMesh) {
            const s = 1 + 0.1 * Math.sin(time * 3);
            this.goalMesh.scale.set(s, 1, s);
        }
    }

    getWallData() {
        // Return wall segment data for physics
        const cs = CONFIG.CELL_SIZE;
        const wt = CONFIG.WALL_THICKNESS;
        const wh = CONFIG.WALL_HEIGHT;
        const walls = [];

        for (const [row, col, side] of this.level.walls) {
            const { x, z } = this.cellToWorld(row, col);
            let wx, wz, ww, wd;

            if (side === 's') { wx = x; wz = z + cs / 2; ww = cs + wt; wd = wt; }
            else if (side === 'n') { wx = x; wz = z - cs / 2; ww = cs + wt; wd = wt; }
            else if (side === 'e') { wx = x + cs / 2; wz = z; ww = wt; wd = cs + wt; }
            else { wx = x - cs / 2; wz = z; ww = wt; wd = cs + wt; }

            walls.push({ x: wx, z: wz, w: ww, h: wh, d: wd });
        }

        // Rim walls
        const totalW = this.level.cols * cs;
        const totalH = this.level.rows * cs;
        const rimT = CONFIG.WALL_THICKNESS * 2;
        const rimH = CONFIG.RIM_HEIGHT;
        walls.push({ x: 0, z: -totalH / 2 - rimT / 2, w: totalW + rimT * 2, h: rimH, d: rimT });
        walls.push({ x: 0, z: totalH / 2 + rimT / 2, w: totalW + rimT * 2, h: rimH, d: rimT });
        walls.push({ x: -totalW / 2 - rimT / 2, z: 0, w: rimT, h: rimH, d: totalH });
        walls.push({ x: totalW / 2 + rimT / 2, z: 0, w: rimT, h: rimH, d: totalH });

        return walls;
    }

    getHolePositions() {
        const holes = [];
        for (let r = 0; r < this.level.rows; r++) {
            for (let c = 0; c < this.level.cols; c++) {
                if (this.level.cells[r][c] === 1) {
                    holes.push(this.cellToWorld(r, c));
                }
            }
        }
        return holes;
    }
}
