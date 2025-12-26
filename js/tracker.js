/**
 * Tracker Module - Simple navigation with debounce
 */
var Tracker = {
    currentDate: null,
    saveTimeouts: {},
    navLocked: false,

    init: function() {
        this.currentDate = this.getTodayDate();
        this.bindNavigation();
        this.bindModal();
        this.render();
    },

    getTodayDate: function() {
        var today = new Date();
        return today.toISOString().split('T')[0];
    },

    formatDate: function(dateString) {
        var date = new Date(dateString + 'T12:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    },

    formatHeaderDate: function(dateString) {
        var date = new Date(dateString + 'T12:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    },

    bindNavigation: function() {
        var self = this;
        var prevBtn = document.getElementById('prevDay');
        var nextBtn = document.getElementById('nextDay');
        
        var newPrev = prevBtn.cloneNode(true);
        var newNext = nextBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrev, prevBtn);
        nextBtn.parentNode.replaceChild(newNext, nextBtn);
        
        newPrev.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            self.goBack();
        }, false);
        
        newNext.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            self.goForward();
        }, false);
    },

    goBack: function() {
        if (this.navLocked) return;
        this.navLocked = true;
        var date = new Date(this.currentDate + 'T12:00:00');
        date.setDate(date.getDate() - 1);
        this.currentDate = date.toISOString().split('T')[0];
        this.render();
        var self = this;
        setTimeout(function() { self.navLocked = false; }, 500);
    },

    goForward: function() {
        if (this.navLocked) return;
        this.navLocked = true;
        var date = new Date(this.currentDate + 'T12:00:00');
        date.setDate(date.getDate() + 1);
        this.currentDate = date.toISOString().split('T')[0];
        this.render();
        var self = this;
        setTimeout(function() { self.navLocked = false; }, 500);
    },

    bindModal: function() {
        var self = this;
        document.getElementById('addColumnBtn').addEventListener('click', function() { self.openAddColumnModal(); });
        document.getElementById('saveColumn').addEventListener('click', function() { self.saveNewColumn(); });
        document.getElementById('cancelColumn').addEventListener('click', function() { self.closeAddColumnModal(); });
        document.querySelector('#addColumnModal .modal-backdrop').addEventListener('click', function() { self.closeAddColumnModal(); });
        document.getElementById('columnName').addEventListener('keypress', function(e) { if (e.key === 'Enter') self.saveNewColumn(); });
    },

    render: function() {
        document.getElementById('currentDate').textContent = this.formatDate(this.currentDate);
        document.getElementById('headerDate').textContent = this.formatHeaderDate(this.currentDate);
        var columns = Storage.getColumns();
        var entry = Storage.getEntry(this.currentDate);
        var container = document.getElementById('trackerTable');
        var self = this;

        if (columns.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No columns yet. Tap "Add Column" to start!</p></div>';
            return;
        }

        var html = '';
        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            var val = entry[col.id] || '';
            html += '<div class="tracker-row"><label class="tracker-label">' + this.escapeHtml(col.name) + '</label>';
            html += '<input type="' + (col.type === 'number' ? 'number' : 'text') + '" class="tracker-input" data-column-id="' + col.id + '" value="' + this.escapeHtml(val) + '" placeholder="' + (col.type === 'number' ? '0' : 'Enter...') + '">';
            html += '<button class="delete-col-btn" data-column-id="' + col.id + '" type="button">✕</button></div>';
        }
        container.innerHTML = html;

        var inputs = container.querySelectorAll('.tracker-input');
        for (var j = 0; j < inputs.length; j++) { inputs[j].addEventListener('input', function(e) { self.handleInput(e); }); }
        var delBtns = container.querySelectorAll('.delete-col-btn');
        for (var k = 0; k < delBtns.length; k++) { delBtns[k].addEventListener('click', function(e) { self.deleteColumn(e); }); }
    },

    handleInput: function(e) {
        var input = e.target;
        var columnId = input.getAttribute('data-column-id');
        var value = input.value;
        var self = this;
        if (this.saveTimeouts[columnId]) clearTimeout(this.saveTimeouts[columnId]);
        this.saveTimeouts[columnId] = setTimeout(function() {
            Storage.saveValue(self.currentDate, columnId, value);
            App.showToast('Saved!');
        }, 500);
    },

    openAddColumnModal: function() {
        document.getElementById('columnName').value = '';
        document.getElementById('columnType').value = 'text';
        document.getElementById('addColumnModal').classList.add('active');
        setTimeout(function() { document.getElementById('columnName').focus(); }, 100);
    },

    closeAddColumnModal: function() {
        document.getElementById('addColumnModal').classList.remove('active');
    },

    saveNewColumn: function() {
        var name = document.getElementById('columnName').value.trim();
        var type = document.getElementById('columnType').value;
        if (!name) { document.getElementById('columnName').focus(); return; }
        Storage.addColumn(name, type);
        this.closeAddColumnModal();
        this.render();
        if (typeof Charts !== 'undefined') Charts.updateColumnSelect();
        App.showToast('Column added!');
    },

    deleteColumn: function(e) {
        var columnId = e.target.getAttribute('data-column-id');
        var columns = Storage.getColumns();
        var column = null;
        for (var i = 0; i < columns.length; i++) { if (columns[i].id === columnId) { column = columns[i]; break; } }
        if (column && confirm('Delete "' + column.name + '"?')) {
            Storage.deleteColumn(columnId);
            this.render();
            if (typeof Charts !== 'undefined') Charts.updateColumnSelect();
            App.showToast('Deleted');
        }
    },

    escapeHtml: function(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
