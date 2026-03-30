document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const wordGrid = document.getElementById('wordGrid');
    const searchInput = document.getElementById('searchInput');
    const filterTabs = document.getElementById('filterTabs');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsInfo = document.getElementById('resultsInfo');
    const showingCount = document.getElementById('showingCount');
    const resetChecklistBtn = document.getElementById('resetChecklistBtn');

    // State
    let allWords = [];
    let filteredWords = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let currentPage = 1;
    const itemsPerPage = 30;
    let memorizedWords = JSON.parse(localStorage.getItem('memorizedWords') || '[]');

    // Load Data
    function initData() {
        if (typeof wordsDatabase !== 'undefined') {
            allWords = wordsDatabase.sort((a, b) => a.word.localeCompare(b.word));
            loadingIndicator.style.display = 'none';
            resultsInfo.style.display = 'block';
            document.getElementById('pagination').style.display = 'flex';
            filterData();
        } else {
            loadingIndicator.innerHTML = `
                <div style="color: #ef4444;text-align:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1rem"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p>Failed to load database. <br>Please make sure generation script has finished creating words_data.js</p>
                </div>
            `;
        }
    }

    initData();

    // Event Listeners

    resetChecklistBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset your checklist?")) {
            memorizedWords = [];
            localStorage.setItem('memorizedWords', JSON.stringify(memorizedWords));
            filterData();
        }
    });

    wordGrid.addEventListener('click', (e) => {
        const speaker = e.target.closest('.speaker-icon');
        if (speaker) {
            const word = speaker.getAttribute('data-word');
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
            return;
        }

        const memoBtn = e.target.closest('.memo-btn');
        if (memoBtn) {
            const word = memoBtn.getAttribute('data-word');
            if (memorizedWords.includes(word)) {
                memorizedWords = memorizedWords.filter(w => w !== word);
            } else {
                memorizedWords.push(word);
            }
            localStorage.setItem('memorizedWords', JSON.stringify(memorizedWords));
            filterData();
        }
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        currentPage = 1;
        filterData();
    });

    filterTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            // Update active styling
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Update filter
            currentFilter = e.target.dataset.filter;
            currentPage = 1;
            filterData();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    nextBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(filteredWords.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Filtering Logic
    function filterData() {
        filteredWords = allWords.filter(wordObj => {
            // Category filter
            if (currentFilter === 'memorized') {
                if (!memorizedWords.includes(wordObj.word)) return false;
            } else if (currentFilter !== 'all' && wordObj.category !== currentFilter) {
                return false;
            }
            // Search filter
            if (searchQuery) {
                const searchStr = `${wordObj.word} ${wordObj.meaning} ${wordObj.bangla || ''}`.toLowerCase();
                if (!searchStr.includes(searchQuery)) {
                    return false;
                }
            }
            return true;
        });

        showingCount.textContent = filteredWords.length;
        resetChecklistBtn.style.display = (currentFilter === 'memorized' && memorizedWords.length > 0) ? 'block' : 'none';
        renderPage();
    }

    // Rendering Logic
    function renderPage() {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageWords = filteredWords.slice(start, end);

        wordGrid.innerHTML = '';

        if (pageWords.length === 0) {
            wordGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted); font-size: 1.2rem;">No words found matching your search.</div>`;
            updatePaginationControls(0);
            return;
        }

        pageWords.forEach(wordObj => {
            const card = document.createElement('div');
            card.className = 'word-card';

            // Process mnemonics
            let mnemonicsHTML = '';
            if (wordObj.mnemonics && wordObj.mnemonics.length > 0) {
                const mItems = wordObj.mnemonics.map(m => `<div class="mnemonic-item">${m}</div>`).join('');
                mnemonicsHTML = `
                    <div class="mnemonics-section">
                        <div class="mnemonics-title">Mnemonics</div>
                        ${mItems}
                    </div>
                `;
            } else {
                mnemonicsHTML = `
                    <div class="mnemonics-section" style="opacity:0.5;">
                        <div class="mnemonics-title">Mnemonics</div>
                        <div class="mnemonic-item">No mnemonics available for this word.</div>
                    </div>
                `;
            }

            // Construct additional word data HTML
            let prncHTML = wordObj.prnc ? `<div class="word-prnc" style="color:var(--text-muted); font-style:italic; margin-bottom:0.2rem;">${wordObj.prnc}</div>` : '';
            let posText = wordObj.pos ? wordObj.pos.replace(/\//g, '').trim() : '';
            let posHTML = posText ? `<div class="word-pos" style="color:var(--tag-color); font-weight:600; font-size:0.85rem; margin-bottom:0.8rem;">${posText}</div>` : '';
            let banglaHTML = wordObj.bangla ? `<div class="word-bangla" style="margin-top:1rem;">${wordObj.bangla}</div>` : '';

            let speakerSVG = `
            <svg class="speaker-icon" data-word="${wordObj.word}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style="cursor:pointer; color:var(--primary); transition:color 0.2s; margin-left: 0.5rem;" onmouseover="this.style.color='var(--primary-hover)'" onmouseout="this.style.color='var(--primary)'">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z"/><path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z"/>
            </svg>`;

            const isMemorized = memorizedWords.includes(wordObj.word);
            let memoBtnHTML = `<button class="memo-btn" data-word="${wordObj.word}" style="padding: 0.2rem 0.5rem; border-radius: 6px; border: 1px solid var(--accent); background: ${isMemorized ? 'var(--accent)' : 'transparent'}; color: ${isMemorized ? 'white' : 'var(--accent)'}; cursor:pointer; font-size: 0.75rem; font-weight: 600; margin-top:0.25rem;">
                ${isMemorized ? '✓ Memorized' : '+'}
            </button>`;

            card.innerHTML = `
                <div class="card-header" style="margin-bottom:0.5rem;">
                    <div style="display:flex; align-items:center; flex-wrap:wrap; gap: 0.25rem;">
                        <h2 class="word-title" style="margin-bottom:0;">${wordObj.word}</h2>
                        ${speakerSVG}
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <span class="word-category">${wordObj.category === '333' ? 'Barron\'s 333' : 'Barron\'s 800'}</span>
                        ${memoBtnHTML}
                    </div>
                </div>
                ${prncHTML}
                ${posHTML}
                <div class="word-meaning">${wordObj.meaning}</div>
                ${banglaHTML}
                ${mnemonicsHTML}
            `;
            wordGrid.appendChild(card);
        });

        updatePaginationControls(filteredWords.length);
    }

    function updatePaginationControls(totalItems) {
        const maxPage = Math.ceil(totalItems / itemsPerPage) || 1;

        // Ensure current page is valid
        if (currentPage > maxPage) currentPage = maxPage;

        pageInfo.textContent = `Page ${currentPage} of ${maxPage}`;

        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= maxPage;
    }
});
