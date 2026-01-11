/**
 * PromptLib - Modern Prompt Management Extension
 * Enterprise-grade UI interactions with smooth animations
 */

(function() {
    'use strict';

    // DOM Elements cache
    const elements = {
        tabs: null,
        searchTab: null,
        addTab: null,
        searchInput: null,
        modalityFilter: null,
        promptList: null,
        promptForm: null,
        promptText: null,
        promptModality: null,
        promptTags: null,
        savePrompt: null,
        toast: null,
        deleteModal: null,
        cancelDelete: null,
        confirmDelete: null,
        versionBadge: null
    };

    // State
    let pendingDeleteId = null;
    let searchDebounceTimer = null;
    const SEARCH_DEBOUNCE_MS = 150;

    /**
     * Initialize the application
     */
    function init() {
        cacheElements();
        bindEvents();
        loadPrompts();
        focusSearchInput();
        loadVersion();
    }

    /**
     * Cache DOM elements for performance
     */
    function cacheElements() {
        elements.tabs = document.querySelectorAll('.tab');
        elements.searchTab = document.getElementById('searchTab');
        elements.addTab = document.getElementById('addTab');
        elements.searchInput = document.getElementById('searchInput');
        elements.modalityFilter = document.getElementById('modalityFilter');
        elements.promptList = document.getElementById('promptList');
        elements.promptForm = document.getElementById('promptForm');
        elements.promptText = document.getElementById('promptText');
        elements.promptModality = document.getElementById('promptModality');
        elements.promptTags = document.getElementById('promptTags');
        elements.savePrompt = document.getElementById('savePrompt');
        elements.toast = document.getElementById('toast');
        elements.deleteModal = document.getElementById('deleteModal');
        elements.cancelDelete = document.getElementById('cancelDelete');
        elements.confirmDelete = document.getElementById('confirmDelete');
        elements.versionBadge = document.getElementById('versionBadge');
    }

    /**
     * Load version from manifest.json
     */
    function loadVersion() {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
            const manifest = chrome.runtime.getManifest();
            elements.versionBadge.textContent = 'v' + manifest.version;
        } else {
            // Fallback for non-extension context (testing)
            elements.versionBadge.textContent = 'v1.0.2';
        }
    }

    /**
     * Bind all event listeners
     */
    function bindEvents() {
        // Tab switching
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });

        // Form submission
        elements.promptForm.addEventListener('submit', handleFormSubmit);

        // Search with debounce
        elements.searchInput.addEventListener('input', handleSearchInput);
        elements.modalityFilter.addEventListener('change', loadPrompts);

        // Delete modal
        elements.cancelDelete.addEventListener('click', hideDeleteModal);
        elements.confirmDelete.addEventListener('click', handleConfirmDelete);
        elements.deleteModal.addEventListener('click', handleModalOverlayClick);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyDown);
    }

    /**
     * Handle tab click
     */
    function handleTabClick(e) {
        const tab = e.currentTarget;
        const targetTab = tab.dataset.tab;

        // Update tab states
        elements.tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        // Update content visibility
        if (targetTab === 'search') {
            elements.searchTab.classList.add('active');
            elements.addTab.classList.remove('active');
            loadPrompts();
            requestAnimationFrame(() => elements.searchInput.focus());
        } else {
            elements.searchTab.classList.remove('active');
            elements.addTab.classList.add('active');
            requestAnimationFrame(() => elements.promptText.focus());
        }
    }

    /**
     * Handle form submission
     */
    function handleFormSubmit(e) {
        e.preventDefault();
        
        const promptText = elements.promptText.value.trim();
        if (!promptText) {
            showToast('Please enter a prompt', 'error');
            elements.promptText.focus();
            return;
        }

        const prompt = {
            text: promptText,
            modality: elements.promptModality.value,
            tags: elements.promptTags.value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag),
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
        };

        chrome.storage.sync.get(['prompts'], function(result) {
            const prompts = result.prompts || [];
            prompts.push(prompt);
            chrome.storage.sync.set({ prompts: prompts }, function() {
                // Clear form
                elements.promptText.value = '';
                elements.promptTags.value = '';
                
                // Show success and switch to search
                showToast('Prompt saved successfully');
                
                // Switch to search tab
                const searchTabBtn = document.querySelector('[data-tab="search"]');
                searchTabBtn.click();
            });
        });
    }

    /**
     * Handle search input with debounce
     */
    function handleSearchInput() {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(loadPrompts, SEARCH_DEBOUNCE_MS);
    }

    /**
     * Handle keyboard shortcuts
     */
    function handleKeyDown(e) {
        // Close modal on Escape
        if (e.key === 'Escape' && elements.deleteModal.classList.contains('show')) {
            hideDeleteModal();
        }
    }

    /**
     * Handle click on modal overlay
     */
    function handleModalOverlayClick(e) {
        if (e.target === elements.deleteModal) {
            hideDeleteModal();
        }
    }

    /**
     * Show delete confirmation modal
     */
    function showDeleteModal(id) {
        pendingDeleteId = id;
        elements.deleteModal.classList.add('show');
        elements.confirmDelete.focus();
    }

    /**
     * Hide delete confirmation modal
     */
    function hideDeleteModal() {
        elements.deleteModal.classList.remove('show');
        pendingDeleteId = null;
    }

    /**
     * Handle confirm delete
     */
    function handleConfirmDelete() {
        if (pendingDeleteId) {
            deletePrompt(pendingDeleteId);
            hideDeleteModal();
        }
    }

    /**
     * Delete a prompt
     */
    function deletePrompt(id) {
        chrome.storage.sync.get(['prompts'], function(result) {
            const prompts = result.prompts || [];
            const updatedPrompts = prompts.filter(p => p.id !== id);
            chrome.storage.sync.set({ prompts: updatedPrompts }, function() {
                showToast('Prompt deleted');
                loadPrompts();
            });
        });
    }

    /**
     * Load and display prompts
     */
    function loadPrompts() {
        const searchText = elements.searchInput.value.toLowerCase();
        const modalityFilter = elements.modalityFilter.value;

        chrome.storage.sync.get(['prompts'], function(result) {
            const prompts = result.prompts || [];
            const filteredPrompts = prompts.filter(prompt => {
                const matchesSearch = prompt.text.toLowerCase().includes(searchText) ||
                    prompt.tags.some(tag => tag.toLowerCase().includes(searchText));
                const matchesModality = !modalityFilter || prompt.modality === modalityFilter;
                return matchesSearch && matchesModality;
            });

            renderPromptList(filteredPrompts);
        });
    }

    /**
     * Render the prompt list
     */
    function renderPromptList(prompts) {
        elements.promptList.innerHTML = '';

        if (prompts.length === 0) {
            elements.promptList.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    <p class="empty-state-title">No prompts found</p>
                    <p class="empty-state-text">Try a different search or add a new prompt</p>
                </div>
            `;
            return;
        }

        // Sort by most recent first (pre-parse timestamps for efficiency)
        prompts.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

        prompts.forEach((prompt, index) => {
            const promptElement = createPromptElement(prompt, index);
            elements.promptList.appendChild(promptElement);
        });
    }

    /**
     * Create a prompt element
     */
    function createPromptElement(prompt, index) {
        const div = document.createElement('div');
        div.className = 'prompt-item';
        div.setAttribute('role', 'listitem');
        div.setAttribute('tabindex', '0');
        div.style.animationDelay = `${index * 30}ms`;

        const tagsHtml = prompt.tags.length > 0
            ? `<div class="tags-container">${prompt.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`
            : '';

        div.innerHTML = `
            <button class="delete-btn" data-id="${prompt.id}" aria-label="Delete prompt" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="prompt-text">${escapeHtml(prompt.text)}</div>
            <div class="prompt-meta">
                <span class="prompt-modality">${escapeHtml(prompt.modality)}</span>
            </div>
            ${tagsHtml}
            <span class="copy-hint">Click to copy</span>
        `;

        // Delete handler
        const deleteBtn = div.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteModal(prompt.id);
        });

        // Copy handler
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn')) {
                copyPrompt(prompt.text, div);
            }
        });

        // Keyboard support
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                copyPrompt(prompt.text, div);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                showDeleteModal(prompt.id);
            }
        });

        return div;
    }

    /**
     * Copy prompt to clipboard
     */
    function copyPrompt(text, element) {
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback
            element.classList.add('copied');
            const copyHint = element.querySelector('.copy-hint');
            copyHint.textContent = 'Copied!';
            copyHint.classList.add('success');

            showToast('Prompt copied to clipboard');

            // Reset after animation
            setTimeout(() => {
                element.classList.remove('copied');
                copyHint.textContent = 'Click to copy';
                copyHint.classList.remove('success');
            }, 1500);
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'success') {
        elements.toast.textContent = message;
        elements.toast.style.background = type === 'error' ? '#ef4444' : '#111827';
        elements.toast.classList.add('show');

        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 2000);
    }

    /**
     * Focus search input
     */
    function focusSearchInput() {
        requestAnimationFrame(() => {
            elements.searchInput.focus();
        });
    }

    /**
     * Escape HTML to prevent XSS
     * Uses character replacement map for efficiency
     */
    const HTML_ESCAPE_MAP = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char]);
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})();