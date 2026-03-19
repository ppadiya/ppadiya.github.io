document.addEventListener('DOMContentLoaded', () => {
    const newsArticlesContainer = document.getElementById('news-articles');
    const eventsCalendar = document.getElementById('events-calendar');
    const eventList = document.getElementById('event-list');
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const errorMessage = document.getElementById('error-message');
    const noResultsMessage = document.getElementById('no-results-message');
    const jsonLdSchema = document.getElementById('json-ld-schema');

    // Ensure back link works properly
    const backLink = document.querySelector('.back-link');
    if (backLink) {
        backLink.addEventListener('click', e => {
            e.preventDefault();
            window.location.href = '/';
        });
    }

    const ITEMS_PER_PAGE = 10;
    let currentCategory = 'loyalty';
    let currentPage = 1;
    let searchQuery = '';
    let allData = { loyalty: [], retail: [], events: [] };

    // --- Helpers ---

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const extractSortableDate = (event) => {
        if (event.date_range) {
            const match = event.date_range.match(/(\w+,\s*\w+\s+\d+)/);
            if (match) {
                const parsed = new Date(match[1] + ', ' + new Date().getFullYear());
                if (!isNaN(parsed.getTime())) return parsed;
            }
        }
        if (event.date) {
            const currentYear = new Date().getFullYear();
            let parsed = new Date(`${event.date} ${currentYear}`);
            if (!isNaN(parsed.getTime()) && parsed < new Date()) {
                parsed = new Date(`${event.date} ${currentYear + 1}`);
            }
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date('2099-12-31');
    };

    const applySearchFilter = (data) => {
        if (!searchQuery) return data;
        const q = searchQuery.toLowerCase();
        return data.filter(item =>
            (item.title?.toLowerCase().includes(q)) ||
            (item.summary?.toLowerCase().includes(q)) ||
            (item.source?.toLowerCase().includes(q)) ||
            (item.location?.toLowerCase().includes(q)) ||
            (item.date_range?.toLowerCase().includes(q))
        );
    };

    // --- UI State ---

    const toggleLoading = (isLoading) => {
        document.querySelectorAll('.loading-skeleton').forEach(s => {
            s.style.display = isLoading ? 'block' : 'none';
        });
        if (isLoading) {
            newsArticlesContainer.style.display = 'none';
            eventsCalendar.style.display = 'none';
        }
        errorMessage.style.display = 'none';
        noResultsMessage.style.display = 'none';
    };

    const displayError = (message = 'Failed to load content. Please try again later.') => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        newsArticlesContainer.innerHTML = '';
        eventList.innerHTML = '';
        newsArticlesContainer.style.display = 'none';
        eventsCalendar.style.display = 'none';
        pageNumbersContainer.innerHTML = '';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
    };

    const displayNoResults = () => {
        noResultsMessage.style.display = 'block';
        newsArticlesContainer.innerHTML = '';
        eventList.innerHTML = '';
        newsArticlesContainer.style.display = 'none';
        eventsCalendar.style.display = 'none';
        pageNumbersContainer.innerHTML = '';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
    };

    // --- Renderers ---

    const renderNewsItems = (items) => {
        newsArticlesContainer.innerHTML = '';
        eventsCalendar.style.display = 'none';
        newsArticlesContainer.style.display = 'grid';

        if (items.length === 0) { displayNoResults(); return; }

        items.forEach(item => {
            const div = document.createElement('div');
            div.classList.add('news-item');
            div.innerHTML = `
                <h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
                <time datetime="${item.date}">${formatDate(item.date)}</time>
                <p>${item.summary}</p>
                <p><small>Source: ${item.source}</small></p>
            `;
            newsArticlesContainer.appendChild(div);
        });
    };

    const renderEvents = (events) => {
        eventList.innerHTML = '';
        newsArticlesContainer.style.display = 'none';
        eventsCalendar.style.display = 'block';

        if (events.length === 0) {
            eventList.innerHTML = '<li><p>No upcoming events.</p></li>';
            return;
        }

        events.forEach(event => {
            const li = document.createElement('li');
            li.classList.add('event-item');
            li.innerHTML = `
                <h4><a href="${event.url}" target="_blank" rel="noopener noreferrer">${event.title}</a></h4>
                <p class="event-date">Date: ${event.date}</p>
                ${event.date_range ? `<p class="event-date-range">Schedule: ${event.date_range}</p>` : ''}
                <p class="event-location">Location: ${event.location || 'N/A'}</p>
                <p>${event.summary}</p>
            `;
            eventList.appendChild(li);
        });
    };

    // --- Pagination ---

    const updatePagination = (totalItems) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        pageNumbersContainer.innerHTML = '';
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

        const maxPageButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
        if (endPage - startPage + 1 < maxPageButtons) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }

        const addPageSpan = (text, page, isActive = false) => {
            const span = document.createElement('span');
            span.textContent = text;
            if (page !== null) {
                span.classList.add('page-num');
                if (isActive) span.classList.add('active-page');
                span.addEventListener('click', () => goToPage(page));
            }
            pageNumbersContainer.appendChild(span);
        };

        if (startPage > 1) {
            addPageSpan('1', 1);
            if (startPage > 2) addPageSpan('...', null);
        }
        for (let i = startPage; i <= endPage; i++) {
            addPageSpan(String(i), i, i === currentPage);
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) addPageSpan('...', null);
            addPageSpan(String(totalPages), totalPages);
        }
    };

    const goToPage = (page) => {
        currentPage = page;
        fetchAndRenderData();
    };

    // --- Data ---

    const fetchAndRenderData = async () => {
        toggleLoading(true);

        try {
            let data = [];

            if (currentCategory === 'events') {
                const { data: eventsData, error } = await supabase
                    .from('events')
                    .select('*')
                    .order('date', { ascending: true });
                if (error) throw new Error(`Supabase error: ${error.message}`);
                data = (eventsData || []).sort((a, b) => extractSortableDate(a) - extractSortableDate(b));
            } else {
                const { data: articlesData, error } = await supabase
                    .from('articles')
                    .select('*')
                    .eq('category', currentCategory)
                    .order('date', { ascending: false });
                if (error) throw new Error(`Supabase error: ${error.message}`);
                data = (articlesData || []).sort((a, b) => new Date(b.date) - new Date(a.date));
            }

            allData[currentCategory] = data;

            const filteredData = applySearchFilter(allData[currentCategory]);
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            if (currentCategory === 'events') {
                renderEvents(paginatedData);
            } else {
                renderNewsItems(paginatedData);
            }
            updatePagination(filteredData.length);
            updateUrlAndSeo();

        } catch (error) {
            displayError(`Failed to load content: ${error.message}`);
        } finally {
            toggleLoading(false);
        }
    };

    // --- SEO ---

    const updateUrlAndSeo = () => {
        const isEvents = currentCategory === 'events';
        const label = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
        let path = `/news-events/${currentCategory}/`;
        let title = `${label} ${isEvents ? 'Calendar' : 'News'} - Pratik Padiya Portfolio`;
        let description = `Latest ${currentCategory} ${isEvents ? 'events' : 'news'} in the Loyalty and Retail industry.`;
        const baseUrl = 'https://pratikpadiyaportfolio.netlify.app';
        let canonicalUrl = `${baseUrl}/news-events/${currentCategory}/`;

        if (currentPage > 1) {
            path += `page/${currentPage}/`;
            title += ` (Page ${currentPage})`;
        }
        if (searchQuery) {
            path += `?search=${encodeURIComponent(searchQuery)}`;
            title += ` - Search: ${searchQuery}`;
        }

        history.pushState({ category: currentCategory, page: currentPage, query: searchQuery }, '', path);
        document.title = title;

        const setMeta = (selector, attr, value) =>
            document.querySelector(selector)?.setAttribute(attr, value);

        setMeta('meta[name="description"]', 'content', description);
        setMeta('meta[property="og:title"]', 'content', title);
        setMeta('meta[property="og:description"]', 'content', description);
        setMeta('meta[property="og:url"]', 'content', `${baseUrl}${path}`);
        setMeta('meta[property="twitter:title"]', 'content', title);
        setMeta('meta[property="twitter:description"]', 'content', description);
        setMeta('meta[property="twitter:url"]', 'content', `${baseUrl}${path}`);
        setMeta('link[rel="canonical"]', 'href', canonicalUrl);

        const top5 = allData[currentCategory].slice(0, 5);
        const schemaItems = isEvents
            ? top5.map(item => ({
                "@context": "https://schema.org", "@type": "Event",
                "name": item.title, "startDate": item.date, "endDate": item.date,
                "location": { "@type": "Place", "name": item.location || "Online" },
                "description": item.summary, "url": item.url,
                "eventStatus": "https://schema.org/EventScheduled"
            }))
            : top5.map(item => ({
                "@context": "https://schema.org", "@type": "NewsArticle",
                "headline": item.title, "datePublished": item.date,
                "author": { "@type": "Organization", "name": item.source },
                "description": item.summary, "url": item.url
            }));

        if (jsonLdSchema) {
            jsonLdSchema.textContent = JSON.stringify({
                "@context": "https://schema.org", "@type": "CollectionPage",
                "name": title, "description": description,
                "mainEntity": schemaItems.length ? schemaItems : undefined
            }, null, 2);
        }
    };

    // --- Event Listeners ---

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) goToPage(currentPage - 1);
    });

    nextPageBtn.addEventListener('click', () => {
        const total = applySearchFilter(allData[currentCategory]).length;
        const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
        if (currentPage < totalPages) goToPage(currentPage + 1);
    });

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentCategory = button.dataset.category;
            currentPage = 1;
            searchQuery = '';
            searchInput.value = '';
            fetchAndRenderData();
        });
    });

    searchButton.addEventListener('click', () => {
        searchQuery = searchInput.value.trim();
        currentPage = 1;
        fetchAndRenderData();
    });

    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            searchQuery = searchInput.value.trim();
            currentPage = 1;
            fetchAndRenderData();
        }
    });

    window.addEventListener('popstate', (event) => {
        if (!window.location.pathname.includes('news-events')) return;

        const state = event.state;
        const parts = window.location.pathname.split('/').filter(Boolean);
        const urlParams = new URLSearchParams(window.location.search);

        currentCategory = state?.category || (parts.includes('news-events') && ['loyalty', 'retail', 'events'].includes(parts[parts.indexOf('news-events') + 1]) ? parts[parts.indexOf('news-events') + 1] : 'loyalty');
        currentPage = state?.page || (parts.includes('page') ? parseInt(parts[parts.indexOf('page') + 1]) : 1);
        searchQuery = state?.query || urlParams.get('search') || '';

        toggleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === currentCategory);
        });
        searchInput.value = searchQuery;
        fetchAndRenderData();
    });

    // --- Init ---

    const init = () => {
        document.getElementById('current-year').textContent = new Date().getFullYear();

        const parts = window.location.pathname.split('/').filter(Boolean);
        const urlParams = new URLSearchParams(window.location.search);

        if (parts.includes('news-events')) {
            const idx = parts.indexOf('news-events');
            const nextPart = parts[idx + 1];
            if (['loyalty', 'retail', 'events'].includes(nextPart)) {
                currentCategory = nextPart;
                document.querySelector(`.toggle-btn[data-category="${currentCategory}"]`)?.classList.add('active');
            }
            if (parts.includes('page')) {
                currentPage = parseInt(parts[parts.indexOf('page') + 1]) || 1;
            }
            searchQuery = urlParams.get('search') || '';
            searchInput.value = searchQuery;
        } else {
            document.querySelector('.toggle-btn[data-category="loyalty"]')?.classList.add('active');
        }

        fetchAndRenderData();
    };

    init();
});
