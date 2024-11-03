document.addEventListener('DOMContentLoaded', function() {
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
    document.getElementById('savePrompt').addEventListener('click', function() {
        const promptText = document.getElementById('promptText').value.trim();
        if (!promptText) {
            alert('Please enter a prompt');
            return;
        }

        const prompt = {
            text: promptText,
            modality: document.getElementById('promptModality').value,
            tags: document.getElementById('promptTags').value.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag), // Remove empty tags
            timestamp: new Date().toISOString(),
            id: Date.now().toString() // Unique ID for deletion
        };

        chrome.storage.sync.get(['prompts'], function(result) {
            const prompts = result.prompts || [];
            prompts.push(prompt);
            chrome.storage.sync.set({ prompts: prompts }, function() {
                // Clear form
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

function deletePrompt(id) {
    chrome.storage.sync.get(['prompts'], function(result) {
        const prompts = result.prompts || [];
        const updatedPrompts = prompts.filter(p => p.id !== id);
        chrome.storage.sync.set({ prompts: updatedPrompts }, function() {
            loadPrompts();
        });
    });
}

function loadPrompts() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const modalityFilter = document.getElementById('modalityFilter').value;

    chrome.storage.sync.get(['prompts'], function(result) {
        const prompts = result.prompts || [];
        const filteredPrompts = prompts.filter(prompt => {
            const matchesSearch = prompt.text.toLowerCase().includes(searchText) ||
                                prompt.tags.some(tag => tag.toLowerCase().includes(searchText));
            const matchesModality = !modalityFilter || prompt.modality === modalityFilter;
            return matchesSearch && matchesModality;
        });

        const promptList = document.getElementById('promptList');
        promptList.innerHTML = '';

        if (filteredPrompts.length === 0) {
            promptList.innerHTML = '<div style="text-align: center; color: #666;">No prompts found</div>';
            return;
        }

        filteredPrompts.forEach(prompt => {
            const promptElement = document.createElement('div');
            promptElement.className = 'prompt-item';
            promptElement.innerHTML = `
                <div class="delete-icon" data-id="${prompt.id}">x</div>
                <div class="prompt-text">
                    ${prompt.text}
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                    Modality: ${prompt.modality}
                </div>
                <div style="margin: 5px 0;">
                    ${prompt.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="copy-hint">Click to copy</div>
            `;

            // Delete handler
            promptElement.querySelector('.delete-icon').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent copying when clicking delete
                if (confirm('Delete this prompt?')) {
                    deletePrompt(prompt.id);
                }
            });

            // Copy handler
            promptElement.addEventListener('click', function(e) {
                if (!e.target.classList.contains('delete-icon')) {
                    navigator.clipboard.writeText(prompt.text);
                    // Visual feedback for copy
                    const originalBackground = promptElement.style.background;
                    promptElement.style.background = '#e8f5e9';
                    setTimeout(() => {
                        promptElement.style.background = originalBackground;
                    }, 200);
                    // change copy-hint to "Copied!"
                    const copyHint = promptElement.querySelector('.copy-hint');
                    copyHint.textContent = 'Copied!';
                }
            });

            promptList.appendChild(promptElement);
        });
    });
}