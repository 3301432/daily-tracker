/**
 * Main App Module - Navigation and initialization
 */

const App = {
    currentView: 'todayView',

    init() {
        Tracker.init();
        History.init();
        Charts.init();
        this.setupNavigation();
        this.registerServiceWorker();
    },

    setupNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchView(tab.dataset.view));
        });
    },

    switchView(viewId) {
        this.currentView = viewId;
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewId);
        });
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === viewId);
        });
        if (viewId === 'todayView') Tracker.render();
        else if (viewId === 'historyView') History.render();
        else if (viewId === 'chartsView') Charts.render();
    },

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2000);
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => { });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
