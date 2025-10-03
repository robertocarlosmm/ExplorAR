export const PuzzlePanel = {
    id: 'puzzle',
    template() {
        return `
            <div class="panel panel-puzzle">
                <div class="bottombar">
                <button id="btn-rotate-left">←</button>
                <button id="btn-rotate-right">→</button>
                <button id="btn-hint">Pista</button>
                </div>
            </div>`;
    },
    mount(root, actions) {
        root.querySelector('#btn-rotate-left').addEventListener('click', actions.onRotateLeft);
        root.querySelector('#btn-rotate-right').addEventListener('click', actions.onRotateRight);
        root.querySelector('#btn-hint').addEventListener('click', actions.onHint);
    },
    unmount(root) {
        // opcional: removeEventListener si agregas handlers inline
    }
};
