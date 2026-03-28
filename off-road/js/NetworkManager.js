class NetworkManager {
    constructor() {
        this.peer = null;
        this.connections = new Map(); // peerId -> DataConnection
        this.isHost = false;
        this.roomCode = '';
        this.localId = '';
        this.hostId = '';

        // Player registry
        this.players = new Map(); // peerId -> { id, name, color, ready, rtt, connected }

        // Callbacks
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onGameState = null;
        this.onInput = null;
        this.onLobbyState = null;
        this.onRaceStart = null;
        this.onRaceEnd = null;
        this.onEvent = null;
        this.onError = null;
        this.onConnected = null;
        this.onDisconnected = null;

        // Ping tracking
        this.pingTimestamps = new Map();
        this.rtts = new Map();
        this.pingInterval = null;
        this.heartbeatInterval = null;

        // Reconnection
        this.reconnectTimers = new Map();

        // State
        this.connected = false;
        this.connecting = false;
    }

    // === ROOM CREATION (Host) ===

    createRoom(playerName) {
        return new Promise((resolve, reject) => {
            this.isHost = true;
            this.roomCode = this._generateRoomCode();
            const peerId = 'offroad-' + this.roomCode;

            this._createPeer(peerId, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.localId = peerId;
                this.hostId = peerId;

                // Add self as first player
                this.players.set(peerId, {
                    id: peerId,
                    name: playerName || 'Host',
                    colorIndex: 0,
                    ready: true,
                    rtt: 0,
                    connected: true,
                });

                // Listen for incoming connections
                this.peer.on('connection', (conn) => this._handleIncomingConnection(conn));

                this.connected = true;
                resolve(this.roomCode);
            });
        });
    }

    // === ROOM JOINING (Client) ===

    joinRoom(roomCode, playerName) {
        return new Promise((resolve, reject) => {
            this.isHost = false;
            this.roomCode = roomCode.toUpperCase();
            this.hostId = 'offroad-' + this.roomCode;

            this._createPeer(null, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.localId = this.peer.id;
                this._connectToHost(playerName, resolve, reject);
            });
        });
    }

    _connectToHost(playerName, resolve, reject, retryCount) {
        retryCount = retryCount || 0;

        const conn = this.peer.connect(this.hostId, { reliable: true });

        conn.on('open', () => {
            this.connections.set(this.hostId, conn);
            this.connected = true;
            this.connecting = false;

            // Send player info
            this.send(this.hostId, {
                type: 'playerInfo',
                name: playerName || 'Player',
                peerId: this.localId,
            });

            // Listen for messages from host
            conn.on('data', (data) => this._handleMessage(this.hostId, data));

            conn.on('close', () => {
                this.connected = false;
                this.connections.delete(this.hostId);
                if (this.onDisconnected) this.onDisconnected('Host disconnected');
            });

            if (this.onConnected) this.onConnected();
            resolve();
        });

        conn.on('error', (err) => {
            if (retryCount < CONFIG.NETWORK.MAX_RETRIES) {
                const delay = CONFIG.NETWORK.RETRY_BASE_DELAY * Math.pow(2, retryCount);
                setTimeout(() => {
                    this._connectToHost(playerName, resolve, reject, retryCount + 1);
                }, delay);
            } else {
                this.connecting = false;
                reject(new Error('Could not connect to room. Check the code and try again.'));
            }
        });
    }

    // === PEER CREATION ===

    _createPeer(peerId, callback) {
        this.connecting = true;

        const config = {
            debug: 0,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ]
            }
        };

        try {
            this.peer = peerId ? new Peer(peerId, config) : new Peer(config);
        } catch (e) {
            this.connecting = false;
            callback(new Error('PeerJS not available. Check your connection.'));
            return;
        }

        this.peer.on('open', (id) => {
            this.connecting = false;
            callback(null);
        });

        this.peer.on('error', (err) => {
            this.connecting = false;
            if (err.type === 'unavailable-id') {
                // Room code collision, regenerate
                if (this.isHost) {
                    this.roomCode = this._generateRoomCode();
                    const newId = 'offroad-' + this.roomCode;
                    this.peer.destroy();
                    this._createPeer(newId, callback);
                    return;
                }
            }
            callback(err);
        });

        this.peer.on('disconnected', () => {
            // Try to reconnect to signaling server
            if (!this.peer.destroyed) {
                this.peer.reconnect();
            }
        });
    }

    // === HOST: Handle incoming connection ===

    _handleIncomingConnection(conn) {
        const peerId = conn.peer;

        conn.on('open', () => {
            this.connections.set(peerId, conn);

            conn.on('data', (data) => this._handleMessage(peerId, data));

            conn.on('close', () => {
                this._handlePlayerDisconnect(peerId);
            });
        });

        conn.on('error', () => {
            this._handlePlayerDisconnect(peerId);
        });
    }

    _handlePlayerDisconnect(peerId) {
        const player = this.players.get(peerId);
        if (!player) return;

        player.connected = false;

        // Set reconnect timer
        this.reconnectTimers.set(peerId, setTimeout(() => {
            // Grace period expired, remove player
            this.players.delete(peerId);
            this.connections.delete(peerId);
            this.reconnectTimers.delete(peerId);
            if (this.onPlayerLeft) this.onPlayerLeft(peerId);
            this._broadcastLobbyState();
        }, CONFIG.NETWORK.RECONNECT_WINDOW * 1000));

        if (this.onPlayerLeft) this.onPlayerLeft(peerId);
    }

    // === MESSAGE HANDLING ===

    _handleMessage(fromId, data) {
        switch (data.type) {
            case 'playerInfo':
                this._handlePlayerInfo(fromId, data);
                break;
            case 'input':
                if (this.onInput) this.onInput(fromId, InputManager.deserialize(data.input));
                break;
            case 'ready':
                this._handleReady(fromId, data.ready);
                break;
            case 'gameState':
                if (this.onGameState) this.onGameState(data);
                break;
            case 'lobbyState':
                if (this.onLobbyState) this.onLobbyState(data);
                break;
            case 'raceStart':
                if (this.onRaceStart) this.onRaceStart(data);
                break;
            case 'raceEnd':
                if (this.onRaceEnd) this.onRaceEnd(data);
                break;
            case 'event':
                if (this.onEvent) this.onEvent(data);
                break;
            case 'ping':
                this.send(fromId, { type: 'pong', timestamp: data.timestamp });
                break;
            case 'pong':
                this._handlePong(fromId, data.timestamp);
                break;
            case 'rejoin':
                this._handleRejoin(fromId, data);
                break;
        }
    }

    _handlePlayerInfo(peerId, data) {
        if (!this.isHost) return;

        // Check if rejoining
        const existingTimer = this.reconnectTimers.get(peerId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.reconnectTimers.delete(peerId);
            const player = this.players.get(peerId);
            if (player) {
                player.connected = true;
                player.name = data.name;
                this._broadcastLobbyState();
                return;
            }
        }

        // Check max players
        if (this.players.size >= CONFIG.RACE.MAX_PLAYERS) {
            this.send(peerId, { type: 'event', event: 'roomFull' });
            return;
        }

        // Assign color index
        const usedColors = new Set([...this.players.values()].map(p => p.colorIndex));
        let colorIndex = 0;
        while (usedColors.has(colorIndex) && colorIndex < 8) colorIndex++;

        this.players.set(data.peerId || peerId, {
            id: data.peerId || peerId,
            name: data.name || 'Player',
            colorIndex: colorIndex,
            ready: false,
            rtt: 0,
            connected: true,
        });

        if (this.onPlayerJoined) this.onPlayerJoined(data.peerId || peerId);
        this._broadcastLobbyState();
    }

    _handleReady(peerId, ready) {
        if (!this.isHost) return;
        const player = this.players.get(peerId);
        if (player) {
            player.ready = ready;
            this._broadcastLobbyState();
        }
    }

    _handleRejoin(peerId, data) {
        if (!this.isHost) return;
        const timer = this.reconnectTimers.get(peerId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(peerId);
            const player = this.players.get(peerId);
            if (player) {
                player.connected = true;
            }
        }
    }

    // === PING / RTT ===

    _handlePong(fromId, timestamp) {
        const rtt = performance.now() - timestamp;
        this.rtts.set(fromId, rtt);
        const player = this.players.get(fromId);
        if (player) player.rtt = Math.round(rtt);
    }

    startPinging() {
        this.pingInterval = setInterval(() => {
            const timestamp = performance.now();
            if (this.isHost) {
                for (const [peerId] of this.connections) {
                    this.send(peerId, { type: 'ping', timestamp });
                }
            } else if (this.connected) {
                this.send(this.hostId, { type: 'ping', timestamp });
            }
        }, CONFIG.NETWORK.PING_INTERVAL);
    }

    stopPinging() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    getConnectionQuality(peerId) {
        const rtt = this.rtts.get(peerId) || 0;
        if (rtt < 80) return 'good';
        if (rtt < 150) return 'ok';
        return 'poor';
    }

    // === SENDING ===

    send(peerId, data) {
        const conn = this.connections.get(peerId);
        if (conn && conn.open) {
            try { conn.send(data); } catch (e) {}
        }
    }

    broadcast(data, excludeId) {
        for (const [peerId, conn] of this.connections) {
            if (peerId === excludeId) continue;
            if (conn && conn.open) {
                try { conn.send(data); } catch (e) {}
            }
        }
    }

    // === LOBBY ===

    _broadcastLobbyState() {
        if (!this.isHost) return;

        const playersArray = [];
        for (const [, player] of this.players) {
            playersArray.push({
                id: player.id,
                name: player.name,
                colorIndex: player.colorIndex,
                ready: player.ready,
                rtt: player.rtt,
                connected: player.connected,
            });
        }

        const state = {
            type: 'lobbyState',
            players: playersArray,
            hostId: this.localId,
            roomCode: this.roomCode,
        };

        this.broadcast(state);

        // Also notify locally
        if (this.onLobbyState) this.onLobbyState(state);
    }

    setReady(ready) {
        if (this.isHost) {
            const player = this.players.get(this.localId);
            if (player) player.ready = ready;
            this._broadcastLobbyState();
        } else {
            this.send(this.hostId, { type: 'ready', ready });
        }
    }

    sendInput(input) {
        if (this.isHost) return; // Host processes input locally
        const serialized = new InputManager(null).serialize(input);
        this.send(this.hostId, { type: 'input', input: serialized });
    }

    broadcastGameState(state) {
        if (!this.isHost) return;
        this.broadcast({ type: 'gameState', ...state });
    }

    broadcastEvent(event, eventData) {
        const msg = { type: 'event', event, ...eventData };
        if (this.isHost) {
            this.broadcast(msg);
        }
        // Also handle locally
        if (this.onEvent) this.onEvent(msg);
    }

    startRace(trackIndex) {
        if (!this.isHost) return;
        const msg = { type: 'raceStart', trackIndex };
        this.broadcast(msg);
        if (this.onRaceStart) this.onRaceStart(msg);
    }

    endRace(results) {
        if (!this.isHost) return;
        const msg = { type: 'raceEnd', results };
        this.broadcast(msg);
        if (this.onRaceEnd) this.onRaceEnd(msg);
    }

    // === UTILITY ===

    _generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1 to avoid confusion
        let code = '';
        for (let i = 0; i < CONFIG.NETWORK.ROOM_CODE_LENGTH; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    getPlayerCount() {
        return this.players.size;
    }

    getPlayersArray() {
        return [...this.players.values()];
    }

    // === CLEANUP ===

    disconnect() {
        this.stopPinging();
        for (const [, timer] of this.reconnectTimers) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();
        for (const [, conn] of this.connections) {
            conn.close();
        }
        this.connections.clear();
        this.players.clear();
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.connected = false;
        this.connecting = false;
    }
}
