/**
 * Tracker Module - Handles the Today view
 * FIXED: Navigation now uses inline onclick in HTML + debounce protection
 */

const Tracker = {
    currentDate: null,
    saveTimeouts: {},
    initialized: false,
    isNavigating: false,

    /**
     * Initialize the tracker
     */
    init() {
        this.currentDate = this.getTodayDate();

        // Ensure nav buttons have NO JS onclick handlers (HTML inline handles it)
        const prevBtn = document.getElementById('prevDay');
        const nextBtn = document.getElementById('nextDay');
        if (prevBtn) prevBtn.onclick = null;
        if (nextBtn) nextBtn.onclick = null;

        if (!this.initialized) {
            this.setupEventListeners();
            this.initialized = true;
        }
        this.render();
    },

    /**
     * Get today's date in YYYY-MM-DD format
     */
    getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    },

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Format date for header
     */
    formatHeaderDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Set up event listeners (NOT for navigation - that's inline in HTML)
     */
    setupEventListeners() {
        // Add column button
        document.getElementById('addColumnBtn').onclick = () => this.openAddColumnModal();

        // Modal buttons
        document.getElementById('saveColumn').onclick = () => this.saveNewColumn();
        document.getElementById('cancelColumn').onclick = () => this.closeAddColumnModal();

        // Close modal on backdrop click
        document.querySelector('#addColumnModal .modal-backdrop').onclick = () => this.closeAddColumnModal();

        // Enter key in column name input
        document.getElementById('columnName').onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.saveNewColumn();
            }
        };
    },

    /**
     * Navigate to previous or next day
     * Has debounce protection to prevent double-firing
     */
    navigateDay(direction) {
        // Prevent rapid double-navigation
        if (this.isNavigating) {
            return;
        }
        this.isNavigating = true;

        // Calculate new date
        const date = new Date(this.currentDate + 'T00:00:00');
        date.setDate(date.getDate() + direction);
        this.currentDate = date.toISOString().split('T')[0];

        // Update the view
        this.render();

        // Allow navigation again after delay
        setTimeout(() => {
            this.isNavigating = false;
        }, 400);
    },

    /**
     * Render the tracker view
     */
    render() {
        document.getElementById('currentDate').textContent = this.formatDate(this.currentDate);
        document.getElementById('headerDate').textContent = this.formatHeaderDate(this.currentDate);

        const columns = Storage.getColumns();
        const entry = Storage.getEntry(this.currentDate);
        const container = document.getElementById('trackerTable');

        if (columns.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    <p>No columns yet. Tap "Add Column" to start tracking!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = columns.map(column => `
            <div class="tracker-row" data-column-id="${column.id}">
                <label class="tracker-label">${this.escapeHtml(column.name)}</label>
                <input 
                    type="${column.type === 'number' ? 'number' : 'text'}"
                    class="tracker-input"
                    data-column-id="${column.id}"
                    value="${this.escapeHtml(entry[column.id] || '')}"
                    placeholder="${column.type === 'number' ? '0' : 'Enter...'}"
                    inputmode="${column.type === 'number' ? 'decimal' : 'text'}"
                >
                <button class="delete-col-btn" data-column-id="${column.id}" title="Delete column">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.tracker-input').forEach(input => {
            input.addEventListener('input', (e) => this.handleInput(e));
            input.addEventListener('focus', (e) => e.target.select());
        });

        container.querySelectorAll('.delete-col-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteColumn(e));
        });
    },

    /**
     * Handle input changes with debounce
     */
    handleInput(e) {
        const input = e.target;
        const columnId = input.dataset.columnId;
        const value = input.value;

        if (this.saveTimeouts[columnId]) {
            clearTimeout(this.saveTimeouts[columnId]);
        }

        input.classList.add('saving');

        this.saveTimeouts[columnId] = setTimeout(() => {
            Storage.saveValue(this.currentDate, columnId, value);
            input.classList.remove('saving');
            input.classList.add('saved');
            App.showToast('Saved!');
            setTimeout(() => {
                input.classList.remove('saved');
            }, 1000);
        }, 500);
    },

    openAddColumnModal() {
        document.getElementById('columnName').value = '';
        document.getElementById('columnType').value = 'text';
        document.getElementById('addColumnModal').classList.add('active');
        setTimeout(() => {
            document.getElementById('columnName').focus();
        }, 100);
    },

    closeAddColumnModal() {
        document.getElementById('addColumnModal').classList.remove('active');
    },

    saveNewColumn() {
        const name = document.getElementById('columnName').value.trim();
        const type = document.getElementById('columnType').value;

        if (!name) {
            document.getElementById('columnName').focus();
            return;
        }

        Storage.addColumn(name, type);
        this.closeAddColumnModal();
        this.render();
        Charts.updateColumnSelect();
        App.showToast('Column added!');
    },

    deleteColumn(e) {
        const columnId = e.currentTarget.dataset.columnId;
        const columns = Storage.getColumns();
        const column = columns.find(c => c.id === columnId);

        if (confirm(`Delete "${column.name}" column? This will remove all data for this column.`)) {
            Storage.deleteColumn(columnId);
            this.render();
            Charts.updateColumnSelect();
            App.showToast('Column deleted');
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
