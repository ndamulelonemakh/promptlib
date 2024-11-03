document.addEventListener('DOMContentLoaded', function () {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.tab === 'search') {
                document.getElementById('searchTab').style.display = 'block';
                document.getElementById('addTab').style.display = 'none';
                loadPrompts();
            } else {
                document.getElementById('searchTab').style.display = 'none';
                document.getElementById('addTab').style.display = 'block';
            }
        });
    });

    // Save prompt
    document.getElementById('savePrompt').addEventListener('click', function () {
        const prompt = {
            title: document.getElementById('promptTitle').value,
            text: document.getElementById('promptText').value,
            modality: document.getElementById('promptModality').value,
            tags: document.getElementById('promptTags').value.split(',').map(tag => tag.trim()),
            timestamp: new Date().toISOString()
        };

        chrome.storage.sync.get(['prompts'], function (result) {
            const prompts = result.prompts || [];
            prompts.push(prompt);
            chrome.storage.sync.set({ prompts: prompts }, function () {
                // Clear form
                document.getElementById('promptTitle').value = '';
                document.getElementById('promptText').value = '';
                document.getElementById('promptTags').value = '';
                // Switch to search tab and refresh
                document.querySelector('[data-tab="search"]').click();
            });
        });
    });

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', loadPrompts);
    document.getElementById('modalityFilter').addEventListener('change', loadPrompts);

    // Initial load
    loadPrompts();
});

function loadPrompts() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const modalityFilter = document.getElementById('modalityFilter').value;

    chrome.storage.sync.get(['prompts'], function (result) {
        const prompts = result.prompts || [];
        const filteredPrompts = prompts.filter(prompt => {
            const matchesSearch = prompt.title.toLowerCase().includes(searchText) ||
                prompt.text.toLowerCase().includes(searchText) ||
                prompt.tags.some(tag => tag.toLowerCase().includes(searchText));
            const matchesModality = !modalityFilter || prompt.modality === modalityFilter;
            return matchesSearch && matchesModality;
        });

        const promptList = document.getElementById('promptList');
        promptList.innerHTML = '';

        filteredPrompts.forEach(prompt => {
            const promptElement = document.createElement('div');
            promptElement.className = 'prompt-item';
            promptElement.innerHTML = `
                <strong>${prompt.title}</strong>
                <div style="font-size: 12px; color: #666;">
                    Modality: ${prompt.modality}
                </div>
                <div style="margin: 5px 0;">
                    ${prompt.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div style="font-size: 14px; margin-top: 5px;">
                    ${prompt.text}
                </div>
            `;
            promptElement.addEventListener('click', function () {
                navigator.clipboard.writeText(prompt.text);
                // Visual feedback for copy
                const originalBackground = promptElement.style.background;
                promptElement.style.background = '#e8f5e9';
                setTimeout(() => {
                    promptElement.style.background = originalBackground;
                }, 200);
            });
            promptList.appendChild(promptElement);
        });
    });
}