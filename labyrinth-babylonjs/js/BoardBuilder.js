class BoardBuilder {
    constructor(scene, level) {
        this.scene = scene;
        this.level = level;
        this.group = new BABYLON.TransformNode('board', scene);
        this.holeMeshes = [];
        this.startPos = null;
        this.goalPos = null;
        this.goalMesh = null;

        this.build();
    }

    cellToWorld(row, col) {
        const totalW = this.level.cols * CONFIG.CELL_SIZE;
        const totalH = this.level.rows * CONFIG.CELL_SIZE;
        const x = col * CONFIG.CELL_SIZE - totalW / 2 + CONFIG.CELL_SIZE / 2;
        const z = row * CONFIG.CELL_SIZE - totalH / 2 + CONFIG.CELL_SIZE / 2;
        return { x, z };
    }

    hexToColor3(hex) {
        return new BABYLON.Color3(
            ((hex >> 16) & 0xFF) / 255,
            ((hex >> 8) & 0xFF) / 255,
            (hex & 0xFF) / 255
        );
    }

    build() {
        const { rows, cols } = this.level;
        const totalW = cols * CONFIG.CELL_SIZE;
        const totalH = rows * CONFIG.CELL_SIZE;
        const cs = CONFIG.CELL_SIZE;
        const scene = this.scene;

        // Board base
        const board = BABYLON.MeshBuilder.CreateBox('boardBase', {
            width: totalW + 1, height: CONFIG.BOARD_THICKNESS, depth: totalH + 1
        }, scene);
        const boardMat = new BABYLON.StandardMaterial('boardMat', scene);
        boardMat.diffuseColor = this.hexToColor3(CONFIG.BOARD_COLOR);
        boardMat.roughness = 0.7;
        board.material = boardMat;
        board.position.y = -CONFIG.BOARD_THICKNESS / 2;
        board.receiveShadows = true;
        board.parent = this.group;

        // Dark floor under holes
        const floor = BABYLON.MeshBuilder.CreateBox('floor', {
            width: totalW, height: 0.01, depth: totalH
        }, scene);
        const floorMat = new BABYLON.StandardMaterial('floorMat', scene);
        floorMat.diffuseColor = this.hexToColor3(CONFIG.FLOOR_COLOR);
        floor.material = floorMat;
        floor.position.y = -CONFIG.BOARD_THICKNESS + 0.01;
        floor.parent = this.group;

        // Rim walls
        const rimMat = new BABYLON.StandardMaterial('rimMat', scene);
        rimMat.diffuseColor = this.hexToColor3(CONFIG.RIM_COLOR);
        const rimH = CONFIG.RIM_HEIGHT;
        const rimT = CONFIG.WALL_THICKNESS * 2;
        const rims = [
            { w: totalW + rimT * 2, d: rimT, x: 0, z: -totalH / 2 - rimT / 2 },
            { w: totalW + rimT * 2, d: rimT, x: 0, z: totalH / 2 + rimT / 2 },
            { w: rimT, d: totalH, x: -totalW / 2 - rimT / 2, z: 0 },
            { w: rimT, d: totalH, x: totalW / 2 + rimT / 2, z: 0 },
        ];
        rims.forEach((r, i) => {
            const mesh = BABYLON.MeshBuilder.CreateBox('rim' + i, {
                width: r.w, height: rimH, depth: r.d
            }, scene);
            mesh.material = rimMat;
            mesh.position.set(r.x, rimH / 2, r.z);
            mesh.receiveShadows = true;
            mesh.parent = this.group;
        });

        // Interior walls
        const wallMat = new BABYLON.StandardMaterial('wallMat', scene);
        wallMat.diffuseColor = this.hexToColor3(CONFIG.WALL_COLOR);
        const wh = CONFIG.WALL_HEIGHT;
        const wt = CONFIG.WALL_THICKNESS;

        this.level.walls.forEach(([row, col, side], i) => {
            const { x, z } = this.cellToWorld(row, col);
            let wx, wz, ww, wd;

            if (side === 's') { wx = x; wz = z + cs / 2; ww = cs + wt; wd = wt; }
            else if (side === 'n') { wx = x; wz = z - cs / 2; ww = cs + wt; wd = wt; }
            else if (side === 'e') { wx = x + cs / 2; wz = z; ww = wt; wd = cs + wt; }
            else { wx = x - cs / 2; wz = z; ww = wt; wd = cs + wt; }

            const mesh = BABYLON.MeshBuilder.CreateBox('wall' + i, {
                width: ww, height: wh, depth: wd
            }, scene);
            mesh.material = wallMat;
            mesh.position.set(wx, wh / 2, wz);
            mesh.receiveShadows = true;
            mesh.parent = this.group;
        });

        // Cells: holes, start, goal
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellType = this.level.cells[r][c];
                const { x, z } = this.cellToWorld(r, c);

                if (cellType === 1) {
                    const hole = BABYLON.MeshBuilder.CreateCylinder('hole_' + r + '_' + c, {
                        height: CONFIG.BOARD_THICKNESS + 0.1,
                        diameter: CONFIG.HOLE_RADIUS * 2,
                        tessellation: 24
                    }, scene);
                    const holeMat = new BABYLON.StandardMaterial('holeMat', scene);
                    holeMat.diffuseColor = this.hexToColor3(CONFIG.HOLE_COLOR);
                    hole.material = holeMat;
                    hole.position.set(x, -0.05, z);
                    hole.parent = this.group;
                    this.holeMeshes.push(hole);
                } else if (cellType === 2) {
                    const marker = BABYLON.MeshBuilder.CreateCylinder('start', {
                        height: 0.05, diameter: 0.8, tessellation: 24
                    }, scene);
                    const mat = new BABYLON.StandardMaterial('startMat', scene);
                    mat.diffuseColor = this.hexToColor3(CONFIG.START_COLOR);
                    mat.emissiveColor = this.hexToColor3(CONFIG.START_COLOR).scale(0.3);
                    marker.material = mat;
                    marker.position.set(x, 0.03, z);
                    marker.parent = this.group;
                    this.startPos = { x, z };
                } else if (cellType === 3) {
                    this.goalMesh = BABYLON.MeshBuilder.CreateCylinder('goal', {
                        height: 0.05, diameter: 0.8, tessellation: 24
                    }, scene);
                    const mat = new BABYLON.StandardMaterial('goalMat', scene);
                    mat.diffuseColor = new BABYLON.Color3(1, 0.84, 0);
                    mat.emissiveColor = new BABYLON.Color3(1, 0.84, 0);
                    mat.emissiveIntensity = 1;
                    this.goalMesh.material = mat;
                    this.goalMesh.position.set(x, 0.03, z);
                    this.goalMesh.parent = this.group;
                    this.goalPos = { x, z };
                }
            }
        }
    }

    update(time) {
        if (this.goalMesh) {
            const s = 1 + 0.1 * Math.sin(time * 3);
            this.goalMesh.scaling.set(s, 1, s);
        }
    }

    getWallData() {
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

    dispose() {
        this.group.getChildMeshes().forEach(m => m.dispose());
        this.group.dispose();
    }
}
