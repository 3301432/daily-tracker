/**
 * Tracker Module - Handles the Today view
 */

const Tracker = {
    currentDate: null,
    saveTimeouts: {},
    initialized: false,

    /**
     * Initialize the tracker
     */
    init() {
        this.currentDate = this.getTodayDate();
        // Only set up event listeners once
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
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation buttons - use onclick to ensure only one handler
        const prevBtn = document.getElementById('prevDay');
        const nextBtn = document.getElementById('nextDay');

        prevBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.navigateDay(-1);
        };

        nextBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.navigateDay(1);
        };

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
     * Navigate to previous or next day (debounced)
     */
    isNavigating: false,

    navigateDay(direction) {
        // Prevent double navigation
        if (this.isNavigating) return;
        this.isNavigating = true;

        const date = new Date(this.currentDate + 'T00:00:00');
        date.setDate(date.getDate() + direction);
        this.currentDate = date.toISOString().split('T')[0];
        this.render();

        // Reset after short delay
        setTimeout(() => {
            this.isNavigating = false;
        }, 300);
    },

    /**
     * Render the tracker view
     */
    render() {
        // Update date display
        document.getElementById('currentDate').textContent = this.formatDate(this.currentDate);

        // Update header date
        document.getElementById('headerDate').textContent = this.formatHeaderDate(this.currentDate);

        // Get columns and current entry
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

        // Add event listeners to inputs
        container.querySelectorAll('.tracker-input').forEach(input => {
            input.addEventListener('input', (e) => this.handleInput(e));
            input.addEventListener('focus', (e) => e.target.select());
        });

        // Add event listeners to delete buttons
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

        // Clear existing timeout for this column
        if (this.saveTimeouts[columnId]) {
            clearTimeout(this.saveTimeouts[columnId]);
        }

        // Add saving indicator
        input.classList.add('saving');

        // Debounce save
        this.saveTimeouts[columnId] = setTimeout(() => {
            Storage.saveValue(this.currentDate, columnId, value);
            input.classList.remove('saving');
            input.classList.add('saved');

            // Show toast
            App.showToast('Saved!');

            // Remove saved class after animation
            setTimeout(() => {
                input.classList.remove('saved');
            }, 1000);
        }, 500);
    },

    /**
     * Open add column modal
     */
    openAddColumnModal() {
        document.getElementById('columnName').value = '';
        document.getElementById('columnType').value = 'text';
        document.getElementById('addColumnModal').classList.add('active');
        setTimeout(() => {
            document.getElementById('columnName').focus();
        }, 100);
    },

    /**
     * Close add column modal
     */
    closeAddColumnModal() {
        document.getElementById('addColumnModal').classList.remove('active');
    },

    /**
     * Save new column
     */
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

        // Also update charts column select
        Charts.updateColumnSelect();

        App.showToast('Column added!');
    },

    /**
     * Delete a column
     */
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

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
