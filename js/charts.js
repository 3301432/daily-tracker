/**
 * Charts Module - Handles visualizations
 */

const Charts = {
    chart: null,
    currentPeriod: 'daily',
    currentColumnId: null,

    /**
     * Initialize charts
     */
    init() {
        this.setupEventListeners();
        this.updateColumnSelect();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Period toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.render();
            });
        });

        // Column selector
        document.getElementById('columnSelect').addEventListener('change', (e) => {
            this.currentColumnId = e.target.value;
            this.render();
        });
    },

    /**
     * Update the column select dropdown
     */
    updateColumnSelect() {
        const select = document.getElementById('columnSelect');
        const columns = Storage.getColumns().filter(col => col.type === 'number');

        if (columns.length === 0) {
            select.innerHTML = '<option value="">No numeric columns</option>';
            select.disabled = true;
            this.currentColumnId = null;
        } else {
            select.innerHTML = columns.map(col =>
                `<option value="${col.id}">${this.escapeHtml(col.name)}</option>`
            ).join('');
            select.disabled = false;

            // Set current column if not set or if current is no longer available
            if (!this.currentColumnId || !columns.find(c => c.id === this.currentColumnId)) {
                this.currentColumnId = columns[0].id;
            }
            select.value = this.currentColumnId;
        }
    },

    /**
     * Render the chart
     */
    render() {
        this.updateColumnSelect();

        const chartContainer = document.querySelector('.chart-container');
        const chartEmpty = document.getElementById('chartEmpty');

        if (!this.currentColumnId) {
            chartContainer.style.display = 'none';
            chartEmpty.classList.add('visible');
            return;
        }

        const data = Storage.getChartData(this.currentColumnId, this.currentPeriod);

        if (data.length === 0) {
            chartContainer.style.display = 'none';
            chartEmpty.classList.add('visible');
            return;
        }

        chartContainer.style.display = 'block';
        chartEmpty.classList.remove('visible');

        const column = Storage.getColumns().find(c => c.id === this.currentColumnId);
        const labels = data.map(d => this.formatLabel(d.date, this.currentPeriod));
        const values = data.map(d => d.value);

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = document.getElementById('progressChart').getContext('2d');

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(108, 92, 231, 0.5)');
        gradient.addColorStop(1, 'rgba(108, 92, 231, 0.0)');

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: column ? column.name : 'Value',
                    data: values,
                    borderColor: '#6c5ce7',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6c5ce7',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#a0a0b8',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                return this.formatTooltipTitle(data[items[0].dataIndex].date, this.currentPeriod);
                            },
                            label: (item) => {
                                const suffix = this.currentPeriod === 'monthly' ? ' (total)' : '';
                                return `${column ? column.name : 'Value'}: ${item.raw}${suffix}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6b6b80',
                            font: {
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6b6b80',
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Format label for chart axis
     */
    formatLabel(dateString, period) {
        if (period === 'monthly') {
            const [year, month] = dateString.split('-');
            const date = new Date(year, parseInt(month) - 1, 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        } else {
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    },

    /**
     * Format tooltip title
     */
    formatTooltipTitle(dateString, period) {
        if (period === 'monthly') {
            const [year, month] = dateString.split('-');
            const date = new Date(year, parseInt(month) - 1, 1);
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else {
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }
    },

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
