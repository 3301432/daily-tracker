/**
 * Storage Module - Handles all localStorage operations
 */

const Storage = {
    KEYS: {
        COLUMNS: 'dt_columns',
        ENTRIES: 'dt_entries'
    },

    /**
     * Get all columns
     * @returns {Array} Array of column objects
     */
    getColumns() {
        const data = localStorage.getItem(this.KEYS.COLUMNS);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Save columns
     * @param {Array} columns - Array of column objects
     */
    saveColumns(columns) {
        localStorage.setItem(this.KEYS.COLUMNS, JSON.stringify(columns));
    },

    /**
     * Add a new column
     * @param {string} name - Column name
     * @param {string} type - Column type ('text' or 'number')
     * @returns {Object} The new column object
     */
    addColumn(name, type) {
        const columns = this.getColumns();
        const newColumn = {
            id: 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            type: type
        };
        columns.push(newColumn);
        this.saveColumns(columns);
        return newColumn;
    },

    /**
     * Delete a column
     * @param {string} columnId - Column ID to delete
     */
    deleteColumn(columnId) {
        const columns = this.getColumns().filter(col => col.id !== columnId);
        this.saveColumns(columns);
        
        // Also remove this column from all entries
        const entries = this.getAllEntries();
        for (const date in entries) {
            if (entries[date][columnId]) {
                delete entries[date][columnId];
            }
        }
        this.saveAllEntries(entries);
    },

    /**
     * Get all entries
     * @returns {Object} Object with dates as keys
     */
    getAllEntries() {
        const data = localStorage.getItem(this.KEYS.ENTRIES);
        return data ? JSON.parse(data) : {};
    },

    /**
     * Save all entries
     * @param {Object} entries - All entries object
     */
    saveAllEntries(entries) {
        localStorage.setItem(this.KEYS.ENTRIES, JSON.stringify(entries));
    },

    /**
     * Get entry for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Object} Entry object for that date
     */
    getEntry(date) {
        const entries = this.getAllEntries();
        return entries[date] || {};
    },

    /**
     * Save a value for a specific column on a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} columnId - Column ID
     * @param {string} value - Value to save
     */
    saveValue(date, columnId, value) {
        const entries = this.getAllEntries();
        if (!entries[date]) {
            entries[date] = {};
        }
        entries[date][columnId] = value;
        this.saveAllEntries(entries);
    },

    /**
     * Get all dates that have entries, sorted descending
     * @returns {Array} Array of date strings
     */
    getTrackedDates() {
        const entries = this.getAllEntries();
        return Object.keys(entries)
            .filter(date => {
                // Only include dates that have at least one non-empty value
                const entry = entries[date];
                return Object.values(entry).some(val => val && val.toString().trim() !== '');
            })
            .sort((a, b) => new Date(b) - new Date(a));
    },

    /**
     * Get data for charts - returns array of {date, value} for a column
     * @param {string} columnId - Column ID
     * @param {string} period - 'daily' or 'monthly'
     * @returns {Array} Array of data points
     */
    getChartData(columnId, period = 'daily') {
        const entries = this.getAllEntries();
        const column = this.getColumns().find(c => c.id === columnId);
        
        if (!column || column.type !== 'number') {
            return [];
        }

        // Get all dates with values for this column
        const dataPoints = [];
        for (const date in entries) {
            const value = parseFloat(entries[date][columnId]);
            if (!isNaN(value)) {
                dataPoints.push({ date, value });
            }
        }

        // Sort by date ascending
        dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (period === 'daily') {
            return dataPoints;
        }

        // Aggregate by month
        const monthlyData = {};
        dataPoints.forEach(({ date, value }) => {
            const month = date.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = 0;
            }
            monthlyData[month] += value;
        });

        return Object.entries(monthlyData)
            .map(([month, value]) => ({ date: month, value }))
            .sort((a, b) => a.date.localeCompare(b.date));
    },

    /**
     * Export all data as JSON
     * @returns {string} JSON string of all data
     */
    exportData() {
        return JSON.stringify({
            columns: this.getColumns(),
            entries: this.getAllEntries()
        }, null, 2);
    },

    /**
     * Import data from JSON
     * @param {string} jsonString - JSON data to import
     */
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.columns) {
                this.saveColumns(data.columns);
            }
            if (data.entries) {
                this.saveAllEntries(data.entries);
            }
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }
};
