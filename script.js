/**
 * Main Application & Communication Layer
 * Handles initialization and the bridge between the Game and External Controllers
 */
class App {
    constructor() {
        this.gameEngine = null;
        this.socket = null;
        this.roomID = this.generateRoomID();
        this.isConnected = false;
        this.pingInterval = null;
        this.init();
    }

    init() {
        console.log("Initializing GameStation Application...");
        this.setupNavigation();
        this.setupWebSocket();
        this.setupUIListeners();
        this.displayPairingInfo();
    }

    /**
     * Generates a unique 6-character Room ID for pairing
     */
    generateRoomID() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    /**
     * WebSocket Implementation for Real-time Controller Pairing
     */
    setupWebSocket() {
        // Using PieSocket for demo purposes
        const wsUrl = `wss://free.blr2.piesocket.com/v3/game_station_demo?api_key=VCXCEuvhuc6EhZ9Pb9D6JzS7pPS9pS9p&notify_self=1`;
        
        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.info("✅ WebSocket Connected. Joining Room:", this.roomID);
                this.sendWSMessage('JOIN_ROOM', { roomID: this.roomID, role: 'host' });
                this.startHeartbeat();
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleIncomingMessage(data);
                } catch (e) {
                    console.error("Error parsing WS message:", e);
                }
            };

            this.socket.onclose = () => {
                console.warn("WebSocket connection closed.");
                this.updateStatus('Disconnected', '#ef4444');
                this.stopHeartbeat();
                // Reconnect strategy
                setTimeout(() => this.setupWebSocket(), 5000);
            };

            this.socket.onerror = (err) => {
                console.error("WebSocket Error:", err);
            };
        } catch (err) {
            console.error("WebSocket Setup Failed:", err);
        }
    }

    startHeartbeat() {
        this.pingInterval = setInterval(() => {
            this.sendWSMessage('PING', { timestamp: Date.now() });
        }, 10000);
    }

    stopHeartbeat() {
        if (this.pingInterval) clearInterval(this.pingInterval);
    }

    sendWSMessage(type, payload) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = {
                type: type.toLowerCase(), // Standardize to lowercase for consistency
                payload,
                roomID: this.roomID.toUpperCase(),
                sender: 'host',
                timestamp: Date.now()
            };
            this.socket.send(JSON.stringify(message));
        }
    }

    handleIncomingMessage(data) {
        // Only process messages for our room (ensure case-insensitive matching)
        if (!data.roomID || data.roomID.toUpperCase() !== this.roomID.toUpperCase()) return;
        // Don't process our own host messages
        if (data.sender === 'host') return;

        const msgType = data.type.toLowerCase();

        switch (msgType) {
            case 'controller_connected':
            case 'controller_joined':
            case 'join_room':
                if (data.role === 'controller' || data.sender === 'controller') {
                    this.onControllerJoined();
                }
                break;
            
            case 'controller_input':
            case 'move':
            case 'up':
            case 'down':
            case 'left':
            case 'right':
            case 'move_up':
            case 'move_down':
            case 'move_left':
            case 'move_right':
                this.processCommand(data);
                break;

            case 'pong':
                this.updateLatency(data.payload?.timestamp);
                break;
        }
    }

    updateLatency(originalTimestamp) {
        if (!originalTimestamp) return;
        const latency = Date.now() - originalTimestamp;
        const latencyEl = document.getElementById('latency-counter');
        if (latencyEl) latencyEl.textContent = `${latency}ms`;
    }

    onControllerJoined() {
        if (this.isConnected) return;
        
        console.info("🎮 Controller successfully paired.");
        this.isConnected = true;
        this.updateStatus('Controller Paired', '#10b981');
        this.hideOverlay();
        
        if (window.gameInstance) {
            window.gameInstance.setEnabled(true);
        }
    }

    displayPairingInfo() {
        const qrPlaceholder = document.querySelector('.qr-placeholder');
        if (qrPlaceholder) {
            qrPlaceholder.innerHTML = `
                <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 5px; font-family: 'Plus Jakarta Sans';">ROOM CODE</div>
                <div style="font-size: 2.5rem; color: #0f172a; font-weight: 800; letter-spacing: 0.1em;" id="room-code-display">${this.roomID}</div>
            `;
        }
    }

    updateStatus(text, color) {
        const statusText = document.getElementById('connection-status');
        const dot = document.querySelector('.status-dot');
        if (statusText) statusText.textContent = text;
        if (dot) {
            dot.style.background = color;
            if (text === 'Controller Paired') dot.classList.remove('pulse');
            else dot.classList.add('pulse');
        }
    }

    processCommand(data) {
        if (!this.isConnected) {
            // Auto-pair if we receive input from the correct room but missed the join event
            this.onControllerJoined();
        }
        
        if (window.gameInstance) {
            window.gameInstance.handleInput(data);
        }
    }

    hideOverlay() {
        const overlay = document.getElementById('connection-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
    }

    setupNavigation() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    setupUIListeners() {
        // Track FPS
        let lastTime = performance.now();
        let frames = 0;
        const fpsEl = document.getElementById('fps-counter');

        const updateFPS = () => {
            frames++;
            const now = performance.now();
            if (now >= lastTime + 1000) {
                if (fpsEl) fpsEl.textContent = frames;
                frames = 0;
                lastTime = now;
            }
            requestAnimationFrame(updateFPS);
        };
        requestAnimationFrame(updateFPS);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.gameStation = new App();
});