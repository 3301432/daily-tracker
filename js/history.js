/**
 * History Module - Handles the History view
 */

const History = {
    editingDate: null,

    /**
     * Initialize history view
     */
    init() {
        this.setupEventListeners();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Edit modal buttons
        document.getElementById('saveEdit').addEventListener('click', () => this.saveEdit());
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeEditModal());
        document.querySelector('#editEntryModal .modal-backdrop').addEventListener('click', () => this.closeEditModal());
    },

    /**
     * Render history view
     */
    render() {
        const container = document.getElementById('historyContainer');
        const dates = Storage.getTrackedDates();
        const columns = Storage.getColumns();

        if (dates.length === 0) {
            container.innerHTML = `
                <div class="history-empty">
                    <p>No tracked days yet. Start tracking on the Today tab!</p>
                </div>
            `;
            return;
        }

        const entries = Storage.getAllEntries();

        container.innerHTML = dates.map(date => {
            const entry = entries[date] || {};
            const entryHtml = columns
                .filter(col => entry[col.id] && entry[col.id].toString().trim() !== '')
                .map(col => `
                    <span class="history-entry">
                        <strong>${this.escapeHtml(col.name)}:</strong> 
                        ${this.escapeHtml(entry[col.id])}
                    </span>
                `)
                .join('');

            return `
                <div class="history-card" data-date="${date}">
                    <div class="history-date">${this.formatDate(date)}</div>
                    <div class="history-entries">
                        ${entryHtml || '<span class="history-entry" style="color: var(--text-muted);">No data</span>'}
                    </div>
                </div>
            `;
        }).join('');

        // Add click listeners to cards
        container.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', () => this.openEditModal(card.dataset.date));
        });
    },

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Open edit modal for a specific date
     */
    openEditModal(date) {
        this.editingDate = date;
        const columns = Storage.getColumns();
        const entry = Storage.getEntry(date);
        const form = document.getElementById('editEntryForm');

        // Update modal title
        document.querySelector('#editEntryModal h3').textContent = `Edit - ${this.formatDate(date)}`;

        if (columns.length === 0) {
            form.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No columns defined.</p>';
        } else {
            form.innerHTML = columns.map(col => `
                <div class="form-group">
                    <label for="edit_${col.id}">${this.escapeHtml(col.name)}</label>
                    <input 
                        type="${col.type === 'number' ? 'number' : 'text'}"
                        id="edit_${col.id}"
                        data-column-id="${col.id}"
                        value="${this.escapeHtml(entry[col.id] || '')}"
                        placeholder="${col.type === 'number' ? '0' : 'Enter...'}"
                    >
                </div>
            `).join('');
        }

        document.getElementById('editEntryModal').classList.add('active');
    },

    /**
     * Close edit modal
     */
    closeEditModal() {
        document.getElementById('editEntryModal').classList.remove('active');
        this.editingDate = null;
    },

    /**
     * Save edited entry
     */
    saveEdit() {
        if (!this.editingDate) return;

        const form = document.getElementById('editEntryForm');
        const inputs = form.querySelectorAll('input');

        inputs.forEach(input => {
            const columnId = input.dataset.columnId;
            const value = input.value;
            Storage.saveValue(this.editingDate, columnId, value);
        });

        this.closeEditModal();
        this.render();
        App.showToast('Entry updated!');
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
