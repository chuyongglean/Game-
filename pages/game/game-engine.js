/**
 * Game Engine Component
 * Responsibilities: Rendering the world, processing inputs from App layer.
 */
class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.isEnabled = false; 
        
        this.player = {
            x: 0,
            y: 0,
            size: 45,
            color: '#6366f1',
            targetX: 0,
            targetY: 0,
            speed: 12
        };

        this.moveStep = 45;
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;

        this.render();
    }

    setEnabled(status) {
        this.isEnabled = status;
        console.info(`🕹️ Game Engine State: ${status ? 'ACTIVE' : 'WAITING'}`);
    }

    resize() {
        const container = this.canvas.parentElement;
        if (container) {
            // Maintain internal coordinate system but match display size
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            
            // Keep player in bounds after resize
            this.constrainPlayer();
        }
    }

    /**
     * Handle inputs received from the App layer
     */
    handleInput(data) {
        if (!this.isEnabled) return;

        const type = (data.type || '').toLowerCase();
        
        // 1. Direct Command (e.g., "up", "move_up")
        if (type.includes('up')) this.applyMovement('up');
        else if (type.includes('down')) this.applyMovement('down');
        else if (type.includes('left')) this.applyMovement('left');
        else if (type.includes('right')) this.applyMovement('right');

        // 2. Payload Structure (e.g., type: "move", payload: "up")
        if (type === 'move' && typeof data.payload === 'string') {
            this.applyMovement(data.payload.toLowerCase());
        }

        // 3. Controller Input Object (e.g., type: "controller_input", payload: { action: "move", direction: "up" })
        if (type === 'controller_input' && data.payload) {
            const { action, direction, vector } = data.payload;
            if (action === 'move' && direction) {
                this.applyMovement(direction.toLowerCase());
            } else if (action === 'joystick' && vector) {
                this.player.targetX += vector.x * this.player.speed;
                this.player.targetY += vector.y * this.player.speed;
            }
        }

        this.constrainPlayer();
    }

    applyMovement(direction) {
        switch(direction) {
            case 'up':    this.player.targetY -= this.moveStep; break;
            case 'down':  this.player.targetY += this.moveStep; break;
            case 'left':  this.player.targetX -= this.moveStep; break;
            case 'right': this.player.targetX += this.moveStep; break;
        }
    }

    constrainPlayer() {
        const padding = this.player.size / 2;
        this.player.targetX = Math.max(padding, Math.min(this.canvas.width - padding, this.player.targetX));
        this.player.targetY = Math.max(padding, Math.min(this.canvas.height - padding, this.player.targetY));
    }

    update() {
        // Smooth interpolation
        const lerpFactor = 0.2;
        this.player.x += (this.player.targetX - this.player.x) * lerpFactor;
        this.player.y += (this.player.targetY - this.player.y) * lerpFactor;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        
        if (this.isEnabled) {
            this.drawPlayer();
        } else {
            this.drawWaitingState();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        
        this.ctx.beginPath();
        for(let i=0; i<this.canvas.width; i+=gridSize) {
            this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height);
        }
        for(let i=0; i<this.canvas.height; i+=gridSize) {
            this.ctx.moveTo(0, i); this.ctx.lineTo(this.canvas.width, i);
        }
        this.ctx.stroke();
    }

    drawPlayer() {
        const { x, y, size, color } = this.player;
        
        this.ctx.save();
        
        // Shadow/Glow
        this.ctx.shadowBlur = 25;
        this.ctx.shadowColor = color;
        
        // Body
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(x - size/2, y - size/2, size, size, 12);
        } else {
            this.ctx.rect(x - size/2, y - size/2, size, size);
        }
        this.ctx.fill();
        
        // Detail
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(x - size/2 + 10, y - size/2 + 8, size - 20, 6, 3);
        }
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawWaitingState() {
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = '500 14px "Plus Jakarta Sans"';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("ENGINE STANDBY", this.canvas.width / 2, this.canvas.height / 2 + 100);
    }

    render() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.render());
    }
}

window.gameInstance = new GameEngine('game-canvas');