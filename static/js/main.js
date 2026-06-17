/**
 * BigQuery Release Radar - Client Side Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const btnExport = document.getElementById('btn-export');
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.getElementById('status-text');
    const lastUpdatedText = document.getElementById('last-updated');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterPills = document.querySelectorAll('.filter-pill');
    const releasesContainer = document.getElementById('releases-container');
    const emptyState = document.getElementById('empty-state');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    
    // Dialog / Modal Elements
    const tweetDialog = document.getElementById('tweet-composer-dialog');
    const btnCloseDialog = document.getElementById('btn-close-dialog');
    const btnCancelTweet = document.getElementById('btn-cancel-tweet');
    const btnPostTweet = document.getElementById('btn-post-tweet');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const sourceDate = document.getElementById('source-date');
    const sourceBadge = document.getElementById('source-badge');
    const sourceSnippet = document.getElementById('source-snippet');
    const charCountText = document.getElementById('char-count-text');
    const progressCircle = document.getElementById('char-progress-circle');

    // State
    let allReleases = [];
    let currentReleases = [];
    let currentFilter = 'all';
    let searchQuery = '';
    
    // Progress Ring Calculations
    const circleRadius = 12;
    const circleCircumference = 2 * Math.PI * circleRadius; // ~75.4
    
    // Initialize Progress Ring
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
        progressCircle.style.strokeDashoffset = circleCircumference;
    }

    // Initialize Page
    fetchReleases();

    // Event Listeners
    btnRefresh.addEventListener('click', fetchReleases);
    
    btnExport.addEventListener('click', () => {
        if (currentReleases.length === 0) return;
        
        const headers = ['Date', 'Type', 'Description', 'Link'];
        const rows = currentReleases.map(item => {
            const temp = document.createElement('div');
            temp.innerHTML = item.description;
            let plainDesc = temp.textContent || temp.innerText || "";
            plainDesc = plainDesc.replace(/\s+/g, ' ').trim();
            
            return [
                item.date,
                item.type,
                plainDesc,
                item.link || ''
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => {
                const strVal = String(val).replace(/"/g, '""');
                return `"${strVal}"`;
            }).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_releases_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        toggleClearSearchButton();
        applyFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        toggleClearSearchButton();
        applyFilters();
        searchInput.focus();
    });

    btnResetFilters.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        toggleClearSearchButton();
        
        filterPills.forEach(p => p.classList.remove('active'));
        document.querySelector('.filter-pill[data-filter="all"]').classList.add('active');
        currentFilter = 'all';
        
        applyFilters();
    });

    filterPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            filterPills.forEach(p => p.classList.remove('active'));
            const clickedPill = e.currentTarget;
            clickedPill.classList.add('active');
            currentFilter = clickedPill.getAttribute('data-filter');
            applyFilters();
        });
    });

    // ==========================================================================
    // DATA FETCHING & API INTERACTION
    // ==========================================================================
    async function fetchReleases() {
        setLoadingState(true);
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            
            allReleases = data.releases || [];
            applyFilters();
            setSuccessState();
        } catch (error) {
            console.error('Error fetching release notes:', error);
            setErrorState(error.message);
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            btnRefresh.classList.add('loading');
            btnRefresh.disabled = true;
            btnExport.style.display = 'none';
            statusIndicator.className = 'status-indicator loading';
            statusText.textContent = 'Fetching release feed...';
            
            // Show skeletons if we don't have cached data yet
            if (allReleases.length === 0) {
                renderSkeletons();
            }
        } else {
            btnRefresh.classList.remove('loading');
            btnRefresh.disabled = false;
        }
    }

    function setSuccessState() {
        statusIndicator.className = 'status-indicator live';
        statusText.textContent = 'Live Feed Connected';
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastUpdatedText.textContent = `Last checked: Today at ${timeStr}`;
        btnExport.style.display = allReleases.length > 0 ? 'inline-flex' : 'none';
    }

    function setErrorState(msg) {
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = 'Fetch failed';
        lastUpdatedText.textContent = `Error: ${msg}`;
        btnExport.style.display = 'none';
        
        if (allReleases.length === 0) {
            releasesContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
                    <div class="empty-state-icon" style="color: var(--color-issue);">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h2>Failed to load release notes</h2>
                    <p>${msg}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Try Again</button>
                </div>
            `;
        }
    }

    // ==========================================================================
    // FILTERING & RENDERING
    // ==========================================================================
    function toggleClearSearchButton() {
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
    }

    function applyFilters() {
        let filtered = allReleases;

        // Apply type filter
        if (currentFilter !== 'all') {
            filtered = filtered.filter(item => item.type.toLowerCase() === currentFilter);
        }

        // Apply search query
        if (searchQuery) {
            filtered = filtered.filter(item => {
                const typeText = item.type.toLowerCase();
                const dateText = item.date.toLowerCase();
                const descText = item.description.toLowerCase();
                return typeText.includes(searchQuery) || 
                       dateText.includes(searchQuery) || 
                       descText.includes(searchQuery);
            });
        }

        currentReleases = filtered;
        renderReleases(filtered);
    }

    function renderSkeletons() {
        releasesContainer.innerHTML = Array(3).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-line skeleton-title"></div>
                    <div class="skeleton-badge"></div>
                </div>
                <div class="skeleton-body">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
                <div class="skeleton-footer">
                    <div class="skeleton-btn"></div>
                    <div class="skeleton-btn"></div>
                </div>
            </div>
        `).join('');
    }

    function renderReleases(releases) {
        if (releases.length === 0) {
            releasesContainer.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        releasesContainer.style.display = 'grid';

        releasesContainer.innerHTML = releases.map(item => {
            const typeClass = `type-${item.type.toLowerCase()}`;
            const badgeClass = `badge-${item.type.toLowerCase()}`;
            
            return `
                <article class="release-card ${typeClass}" data-id="${item.id}">
                    <header class="card-header">
                        <div class="card-title-group">
                            <span class="card-date">
                                <i class="fa-regular fa-calendar"></i>
                                ${item.date}
                            </span>
                        </div>
                        <span class="type-badge ${badgeClass}">${item.type}</span>
                    </header>
                    
                    <div class="card-content">
                        ${item.description}
                    </div>
                    
                    <footer class="card-actions">
                        ${item.link ? `
                            <a href="${item.link}" class="card-source-link" target="_blank" rel="noopener">
                                <span>Official Notes</span>
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a>
                        ` : '<span></span>'}
                        
                        <div class="card-btn-group">
                            <button class="btn-copy-action" aria-label="Copy update text to clipboard">
                                <i class="fa-regular fa-copy"></i>
                                <span>Copy</span>
                            </button>
                            <button class="btn-tweet-action" aria-label="Tweet this release update">
                                <i class="fa-brands fa-x-twitter"></i>
                                <span>Tweet</span>
                            </button>
                        </div>
                    </footer>
                </article>
            `;
        }).join('');

        // Attach Copy listeners
        const copyButtons = releasesContainer.querySelectorAll('.btn-copy-action');
        copyButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                copyToClipboard(releases[index], btn);
            });
        });

        // Attach Tweet listeners
        const tweetButtons = releasesContainer.querySelectorAll('.btn-tweet-action');
        tweetButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                openTweetComposer(releases[index]);
            });
        });
    }

    function copyToClipboard(release, button) {
        const temp = document.createElement('div');
        temp.innerHTML = release.description;
        let plainText = temp.textContent || temp.innerText || "";
        plainText = plainText.replace(/\s+/g, ' ').trim();
        
        const copyText = `🚀 [${release.type}] (${release.date})\n\n${plainText}\n\nRead more: ${release.link}`;
        
        navigator.clipboard.writeText(copyText).then(() => {
            button.classList.add('copied');
            const icon = button.querySelector('i');
            const text = button.querySelector('span');
            
            icon.className = 'fa-solid fa-check';
            text.textContent = 'Copied!';
            
            setTimeout(() => {
                button.classList.remove('copied');
                icon.className = 'fa-regular fa-copy';
                text.textContent = 'Copy';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
        });
    }

    // ==========================================================================
    // TWEET COMPOSER DIALOG LOGIC
    // ==========================================================================
    function openTweetComposer(release) {
        // Pre-fill dialog headers/badge
        sourceDate.textContent = release.date;
        sourceBadge.textContent = release.type;
        sourceBadge.className = `source-badge badge-${release.type.toLowerCase()}`;
        
        // Strip HTML to show source snippet
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = release.description;
        const textOnly = tempDiv.textContent || tempDiv.innerText || "";
        sourceSnippet.textContent = textOnly;
        
        // Format initial tweet text
        const initialTweet = formatInitialTweet(release, textOnly);
        tweetTextarea.value = initialTweet;
        
        // Update character count
        updateCharCount();
        
        // Show dialog
        tweetDialog.showModal();
    }

    function formatInitialTweet(release, plainText) {
        const type = release.type;
        const link = release.link || '';
        
        // Clean up whitespace
        let cleanText = plainText.replace(/\s+/g, ' ').trim();
        
        // Calculate max text length so total character count stays under 280
        // Twitter Intent counts characters including hashtags and link
        const hashtagText = `\n\n#BigQuery #GoogleCloud`;
        const linkText = link ? `\n🔗 ${link}` : '';
        
        // Max space for description = 280 - metadata
        const metadataLen = `🚀 [${type}] `.length + hashtagText.length + linkText.length;
        const maxDescLen = 280 - metadataLen - 5; // offset buffer
        
        if (cleanText.length > maxDescLen) {
            cleanText = cleanText.substring(0, maxDescLen - 3) + '...';
        }
        
        return `🚀 [${type}] ${cleanText}${hashtagText}${linkText}`;
    }

    function updateCharCount() {
        const textLength = tweetTextarea.value.length;
        const remaining = 280 - textLength;
        
        charCountText.textContent = remaining;
        
        // Styling based on count
        if (remaining <= 0) {
            charCountText.className = 'char-count-text danger';
            btnPostTweet.disabled = true;
        } else if (remaining <= 40) {
            charCountText.className = 'char-count-text warning';
            btnPostTweet.disabled = false;
        } else {
            charCountText.className = 'char-count-text';
            btnPostTweet.disabled = false;
        }
        
        // Progress Ring Dash Offset
        if (progressCircle) {
            const percentage = Math.min(textLength / 280, 1);
            const offset = circleCircumference - (percentage * circleCircumference);
            progressCircle.style.strokeDashoffset = offset;
            
            // Progress circle color
            if (remaining <= 0) {
                progressCircle.style.stroke = 'var(--color-issue)';
            } else if (remaining <= 40) {
                progressCircle.style.stroke = 'var(--color-announcement)';
            } else {
                progressCircle.style.stroke = 'var(--accent-blue)';
            }
        }
    }

    tweetTextarea.addEventListener('input', updateCharCount);

    // Close Dialog Actions
    function closeComposer() {
        tweetDialog.close();
    }

    btnCloseDialog.addEventListener('click', closeComposer);
    btnCancelTweet.addEventListener('click', closeComposer);
    
    // Post Tweet Intent
    btnPostTweet.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        closeComposer();
    });

    // ==========================================================================
    // LIGHT DISMISS DIALOG FALLBACK (For Safari)
    // ==========================================================================
    if (!('closedBy' in HTMLDialogElement.prototype)) {
        tweetDialog.addEventListener('click', (event) => {
            if (event.target !== tweetDialog) return;
            
            const rect = tweetDialog.getBoundingClientRect();
            const isClickInside = (
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width
            );
            
            if (!isClickInside) {
                closeComposer();
            }
        });
    }
});
