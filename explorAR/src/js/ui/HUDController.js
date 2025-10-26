export class HUDController {
    constructor() {
        this.root = document.getElementById('hud');
        this.slot = document.getElementById('hud-panel-slot');
        this.lblScore = document.getElementById('hud-score');
        this.lblTimer = document.getElementById('hud-timer');
        this.centerMsg = document.getElementById('center-msg');
        this.currentPanel = null; // { id, el, unmount }
        this._timerId = null;
        this._timeLeft = 0;
        this._tickCb = null;
    }

    show() { this.root.classList.remove('hidden'); }
    hide() { this.root.classList.add('hidden'); }

    setScore(n) { if (this.lblScore) this.lblScore.textContent = `PUNTOS: ${n}`; }

    setTime(seconds) {
        this._timeLeft = Math.max(0, seconds | 0);
        if (this.lblTimer) this.lblTimer.textContent = `00:${String(this._timeLeft).padStart(2, '0')}`;
    }

    startTimer(seconds, onTick, onFinish) {
        this.stopTimer();
        this.setTime(seconds);
        this._tickCb = onTick;
        this._timerId = setInterval(() => {
            this._timeLeft--;
            this.setTime(this._timeLeft);
            if (typeof this._tickCb === 'function') this._tickCb(this._timeLeft);
            if (this._timeLeft <= 0) {
                this.stopTimer();
                if (typeof onFinish === 'function') onFinish();
            }
        }, 1000);
    }
    stopTimer() { if (this._timerId) { clearInterval(this._timerId); this._timerId = null; } }

    message(text, ms = 3000) {
        if (!this.centerMsg) return;
        this.centerMsg.textContent = text ?? '';
        this.centerMsg.classList.remove('hidden');
        if (ms) setTimeout(() => this.centerMsg.classList.add('hidden'), ms);
    }

    showPanel(panel, actions = {}) {
        if (this.currentPanel?.unmount) this.currentPanel.unmount(this.currentPanel.el);
        this.slot.innerHTML = panel.template();
        const el = this.slot.firstElementChild;
        panel.mount(el, actions);
        this.currentPanel = { id: panel.id, el, unmount: panel.unmount?.bind(panel) };
    }

    clearPanel() {
        if (this.currentPanel?.unmount) this.currentPanel.unmount(this.currentPanel.el);
        this.slot.innerHTML = '';
        this.currentPanel = null;
    }

    showEndPopup({ score, onRetry, onContinue, timeExpired = false }) {
        console.log("HUD showEndPopup", { score, timeExpired });

        const popup = document.getElementById('game-end-popup');
        const scoreLabel = document.getElementById('popup-score');
        const btnRetry = document.getElementById('btn-retry');
        const btnContinue = document.getElementById('btn-continue');

        if (!popup || !scoreLabel) return;
        scoreLabel.textContent = `Puntaje: ${score ?? 0}`;

        popup.classList.remove('hidden');

        // Reset handlers (clonado para evitar listeners duplicados)
        const newRetry = btnRetry.cloneNode(true);
        const newContinue = btnContinue.cloneNode(true);
        btnRetry.replaceWith(newRetry);
        btnContinue.replaceWith(newContinue);

        // ✅ aplicar visibilidad DESPUÉS de clonar
        newContinue.classList.toggle('hidden', timeExpired);

        // 💡 CORRECCIÓN CLAVE:
        // si no está oculto por timeExpired, aseguramos su visibilidad real
        if (!timeExpired) {
            newContinue.style.opacity = "1";
            newContinue.style.transform = "scale(1)";
            newContinue.style.pointerEvents = "auto";
        } else {
            newContinue.style.opacity = "0";
            newContinue.style.pointerEvents = "none";
        }

        // Handlers
        newRetry.addEventListener("click", () => {
            popup.classList.add("hidden");
            onRetry?.();
        });

        newContinue.addEventListener("click", () => {
            popup.classList.add("hidden");
            onContinue?.();
        });
    }

    // En HUDController.js
    decreaseTime(seconds) {
        if (!this.timerRemaining) return;
        this.timerRemaining = Math.max(0, this.timerRemaining - seconds);
        this.setTime(this.timerRemaining);
    }


    hideEndPopup() {
        const popup = document.getElementById('game-end-popup')
        if (popup) popup.classList.add('hidden')
    }

    // En tu clase HUD
    showHintPopup({ title = "¡ATENCIÓN!", heading = "", hints = [], onClose = null }) {
        console.log("[HUD] Mostrando popup de pistas");

        // Crea o reutiliza el wrapper
        let wrapper = document.getElementById("hint-popup");
        if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.id = "hint-popup";
            wrapper.className = "hidden"; // empieza oculto
            document.body.appendChild(wrapper);
        }

        // Construye el contenido con la convención 'hint-card'
        wrapper.innerHTML = `
            <div class="hint-card">
            <div class="hint-title">${title}</div>
            <div class="hint-heading">${heading}</div>
            <ul class="hint-list">
                ${hints.map(txt => `<li>${txt}</li>`).join("")}
            </ul>
            <button class="hint-close-btn" type="button">Cerrar</button>
            </div>
        `;

        // Mostrar
        wrapper.classList.remove("hidden");

        // Cerrar
        const closeBtn = wrapper.querySelector(".hint-close-btn");
        const handleClose = () => {
            wrapper.classList.add("hidden");
            closeBtn.removeEventListener("click", handleClose);
            if (typeof onClose === "function") onClose();
        };
        closeBtn.addEventListener("click", handleClose);
    }


}
