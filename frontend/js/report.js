// frontend/js/report.js
document.addEventListener('DOMContentLoaded', () => {
    const runId = localStorage.getItem('run_id');
    if (!runId) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('run-id').textContent = `Run ID: ${runId}`;

    const reportContent = document.getElementById('report-content');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    // Simple Markdown to HTML converter
    function mdToHtml(md) {
        // Escape HTML first
        md = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Headings
        md = md.replace(/^### (.*)$/gm, '<h3>$1</h3>');
        md = md.replace(/^## (.*)$/gm, '<h2>$1</h2>');
        md = md.replace(/^# (.*)$/gm, '<h1>$1</h1>');
        // Bold and italic
        md = md.replace(/\*\*(.*)\*\*/gm, '<b>$1</b>');
        md = md.replace(/\*(.*)\*/gm, '<i>$1</i>');
        // Images (including base64)
        md = md.replace(/!\[(.*?)\]\((.*?)\)/gm, '<img alt="$1" src="$2" />');
        // Lists
        md = md.replace(/^\s*-\s+(.*)/gm, '<li>$1</li>');
        md = md.replace(/<li>.*?<\/li>/gs, match => '<ul>' + match + '</ul>');
        // Paragraphs
        md = md.replace(/^\n+/gm, '');
        md = md.replace(/\n+/gm, '<br>');
        return md;
    }

    let apiBase = '';
    if (window.APP_MODE === 'mock') {
        apiBase = './mocks/';
    } else {
        apiBase = '/api/';
    }

    fetch(`${apiBase}${window.APP_MODE === 'mock' ? 'report.json' : 'reports/' + runId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load report');
            return response.json();
        })
        .then(data => {
            loading.style.display = 'none';
            const html = mdToHtml(data.report_md);
            reportContent.innerHTML = html;

            // Handle interactive charts if present (assuming md has <div class="chart" data-type="bar" data-data='{"labels":[...],"datasets":[...]}'></div>)
            reportContent.querySelectorAll('.chart').forEach((div, index) => {
                const canvas = document.createElement('canvas');
                div.appendChild(canvas);
                const type = div.dataset.type || 'bar';
                const chartData = JSON.parse(div.dataset.data);
                new Chart(canvas, {
                    type: type,
                    data: chartData,
                    options: { responsive: true }
                });
            });
        })
        .catch(error => {
            loading.style.display = 'none';
            errorDiv.textContent = error.message;
        });
});