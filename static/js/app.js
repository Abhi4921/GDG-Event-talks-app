document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releases = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let lastFetchedTimestamp = 0;
    let timeIntervalId = null;

    // DOM Elements
    const feedGrid = document.getElementById('feed-grid');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshSpinner = document.getElementById('refresh-spinner');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const feedStatus = document.getElementById('feed-status');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const cacheTimeIndicator = document.getElementById('cache-time');
    const cacheTimeText = document.getElementById('cache-time-text');
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');

    // Initialize Theme
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleIcon.setAttribute('data-lucide', 'moon');
    } else {
        themeToggleIcon.setAttribute('data-lucide', 'sun');
    }

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');

    // Toast Element
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');

    // Initialize Lucide icons
    lucide.createIcons();

    // Fetch releases from the API
    async function fetchReleases(forceRefresh = false) {
        try {
            setLoadingState(true);
            const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                releases = result.data;
                lastFetchedTimestamp = result.last_fetched;
                
                renderReleases();
                updateCounts();
                startRelativeTimeTracker();
                feedStatus.textContent = `Displaying ${releases.length} updates from BigQuery feed.`;
            } else {
                showToast(`Failed to load: ${result.error}`, 'alert-triangle');
                feedStatus.textContent = 'Failed to load updates.';
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showToast(`Connection error. Please try again.`, 'alert-triangle');
            feedStatus.textContent = 'Error connecting to release feed.';
        } finally {
            setLoadingState(false);
        }
    }

    // Set UI loading state
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshSpinner.classList.add('spinning');
            refreshBtn.disabled = true;
            if (releases.length === 0) {
                feedGrid.innerHTML = `
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                `;
            }
        } else {
            refreshSpinner.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    // Render release cards in the feed grid
    function renderReleases() {
        const filtered = releases.filter(item => {
            const matchesFilter = currentFilter === 'all' || item.type.toLowerCase() === currentFilter.toLowerCase();
            const matchesSearch = searchQuery === '' || 
                item.date.toLowerCase().includes(searchQuery) ||
                item.type.toLowerCase().includes(searchQuery) ||
                item.text.toLowerCase().includes(searchQuery);
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            feedGrid.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="inbox"></i>
                    <h3>No release notes found</h3>
                    <p>Try modifying your search query or switching filters.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        feedGrid.innerHTML = filtered.map(item => {
            const decorClass = `card-decor-${item.type.toLowerCase()}`;
            const badgeClass = `badge-${item.type.toLowerCase()}`;
            
            return `
                <article class="release-card" data-id="${item.id}">
                    <div class="card-decor ${decorClass}"></div>
                    <div class="card-header">
                        <div class="card-meta">
                            <span class="badge ${badgeClass}">${item.type}</span>
                            <span class="card-date">${item.date}</span>
                        </div>
                        <div class="card-actions">
                            <button class="card-action-btn" title="Copy release note text" data-action="copy-card">
                                <i data-lucide="copy"></i>
                            </button>
                            <button class="card-action-btn tweet-btn-hover" title="Tweet about this update" data-action="tweet">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </button>
                            <a href="${item.link}" target="_blank" class="card-action-btn" title="Open source feed" style="text-decoration: none;">
                                <i data-lucide="external-link"></i>
                            </a>
                        </div>
                    </div>
                    <div class="card-body">
                        ${item.content_html}
                    </div>
                </article>
            `;
        }).join('');

        // Re-initialize icons in cards
        lucide.createIcons();

        // Attach event listeners to tweet buttons
        document.querySelectorAll('[data-action="tweet"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.currentTarget.closest('.release-card');
                const releaseId = card.getAttribute('data-id');
                const release = releases.find(r => r.id === releaseId);
                if (release) {
                    openTweetModal(release);
                }
            });
        });

        // Attach event listeners to copy card buttons
        document.querySelectorAll('[data-action="copy-card"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.currentTarget.closest('.release-card');
                const releaseId = card.getAttribute('data-id');
                const release = releases.find(r => r.id === releaseId);
                if (release) {
                    navigator.clipboard.writeText(release.text).then(() => {
                        showToast('Release note copied to clipboard!');
                    }).catch(err => {
                        console.error('Clipboard copy failed:', err);
                        showToast('Failed to copy. Please copy manually.', 'alert-triangle');
                    });
                }
            });
        });
    }

    // Calculate dynamic filter counts
    function updateCounts() {
        const counts = {
            all: releases.length,
            Feature: 0,
            Issue: 0,
            Deprecation: 0,
            Change: 0,
            Update: 0
        };

        releases.forEach(item => {
            if (counts[item.type] !== undefined) {
                counts[item.type]++;
            } else {
                counts['Update']++;
            }
        });

        // Update counts in DOM
        document.getElementById('count-all').textContent = counts.all;
        document.getElementById('count-feature').textContent = counts.Feature;
        document.getElementById('count-issue').textContent = counts.Issue;
        document.getElementById('count-deprecation').textContent = counts.Deprecation;
        document.getElementById('count-change').textContent = counts.Change;
        document.getElementById('count-update').textContent = counts.Update;
    }

    // Relative Time Indicator logic
    function startRelativeTimeTracker() {
        if (timeIntervalId) clearInterval(timeIntervalId);
        
        cacheTimeIndicator.style.display = 'flex';
        updateRelativeTime();
        
        timeIntervalId = setInterval(updateRelativeTime, 60000);
    }

    function updateRelativeTime() {
        if (!lastFetchedTimestamp) return;
        
        const diffInSeconds = Math.floor((Date.now() / 1000) - lastFetchedTimestamp);
        
        let text = '';
        if (diffInSeconds < 60) {
            text = 'Updated just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            text = `Updated ${minutes}m ago`;
        } else {
            const hours = Math.floor(diffInSeconds / 3600);
            text = `Updated ${hours}h ago`;
        }
        
        cacheTimeText.textContent = text;
    }

    // Toast feedback notification
    function showToast(message, iconName = 'check-circle') {
        toastMessage.textContent = message;
        
        // Update toast icon dynamically
        const iconContainer = toast.querySelector('.toast-icon');
        iconContainer.setAttribute('data-lucide', iconName);
        lucide.createIcons();

        toast.classList.add('active');
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    // Tweet Draft generation
    function generateTweetDraft(release) {
        const date = release.date;
        const type = release.type;
        const link = release.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
        const hashtags = ' #BigQuery #GoogleCloud';
        
        // Standard syntax: "BigQuery Release (June 15, 2026) [Feature]:\nDescription...\n\nRead more: link #BigQuery #GoogleCloud"
        const prefix = `BigQuery Release (${date}) [${type}]:\n`;
        const suffix = `\n\nRead more: ${link}${hashtags}`;
        
        // We have 280 characters max
        const availableLength = 280 - prefix.length - suffix.length;
        
        let description = release.text;
        if (description.length > availableLength) {
            // Cut text and append ellipses
            description = description.substring(0, availableLength - 3) + '...';
        }
        
        return `${prefix}${description}${suffix}`;
    }

    // Modal Control functions
    function openTweetModal(release) {
        const draft = generateTweetDraft(release);
        tweetTextarea.value = draft;
        updateCharCount();
        
        tweetModal.classList.add('active');
        tweetTextarea.focus();
    }

    function closeTweetModal() {
        tweetModal.classList.remove('active');
    }

    function updateCharCount() {
        const currentLength = tweetTextarea.value.length;
        charCount.textContent = currentLength;
        
        // Visual warning for limits
        if (currentLength >= 280) {
            charCount.className = 'char-counter limit';
        } else if (currentLength >= 250) {
            charCount.className = 'char-counter warning';
        } else {
            charCount.className = 'char-counter';
        }
    }

    // Event Handlers
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    exportCsvBtn.addEventListener('click', () => {
        if (releases.length === 0) {
            showToast('No release notes to export', 'alert-triangle');
            return;
        }

        // Get the current filtered releases list
        const filtered = releases.filter(item => {
            const matchesFilter = currentFilter === 'all' || item.type.toLowerCase() === currentFilter.toLowerCase();
            const matchesSearch = searchQuery === '' || 
                item.date.toLowerCase().includes(searchQuery) ||
                item.type.toLowerCase().includes(searchQuery) ||
                item.text.toLowerCase().includes(searchQuery);
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            showToast('No filtered release notes to export', 'alert-triangle');
            return;
        }

        // Generate CSV content
        const headers = ['ID', 'Date', 'Type', 'Description', 'Link'];
        const rows = filtered.map(item => [
            item.id,
            item.date,
            item.type,
            item.text.replace(/"/g, '""'), // Escape quotes
            item.link
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(val => `"${val}"`).join(','))
        ].join('\n');

        // Create Blob and download it
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_releases_${currentFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('CSV export downloaded!');
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderReleases();
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.getAttribute('data-filter');
            renderReleases();
        });
    });

    // Modal Event listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    
    // Close modal if clicking outside of the card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    tweetTextarea.addEventListener('input', updateCharCount);

    copyTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Tweet copied to clipboard!');
        }).catch(err => {
            console.error('Clipboard copy failed:', err);
            showToast('Failed to copy. Please copy manually.', 'alert-triangle');
        });
    });

    submitTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        
        window.open(twitterUrl, '_blank');
        closeTweetModal();
        showToast('Opened X/Twitter composer!', 'twitter');
    });

    // Theme Toggle event listener
    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        themeToggleIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
        lucide.createIcons();
    });

    // Initial Fetch
    fetchReleases();
});
