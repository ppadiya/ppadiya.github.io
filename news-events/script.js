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
    const jsonLdSchema = document.getElementById('json-ld-schema');// Ensure back link works properly
    const backLink = document.querySelector('.back-link');
    if (backLink) {
        backLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            // Use window.location to navigate, which bypasses History API issues
            window.location.href = '/';
        });
    }const ITEMS_PER_PAGE = 10;
    let currentCategory = 'loyalty'; // 'loyalty', 'retail', 'events'
    let currentPage = 1;
    let searchQuery = '';
    let allData = {
        loyalty: [], retail: [], events: []
    }; // Cache for client-side filtering/pagination    // Function to format date for display
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Function to extract a sortable date from event data
    const extractSortableDate = (event) => {
        // Try to parse from date_range first (more complete info)
        if (event.date_range) {
            // Extract the first date from patterns like "Wed, Oct 15, 9 AM – Fri, Oct 17, 5 PM GMT+8"
            const dateRangeMatch = event.date_range.match(/(\w+,\s*\w+\s+\d+)/);
            if (dateRangeMatch) {
                const dateStr = dateRangeMatch[1] + ', ' + new Date().getFullYear(); // Add current year
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            }
        }
        
        // Fallback to date field
        if (event.date) {
            // Handle partial dates like "Sep 2" by adding current year
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            
            // Try current year first
            let dateWithYear = `${event.date} ${currentYear}`;
            let parsed = new Date(dateWithYear);
            
            // If date is in the past, try next year
            if (!isNaN(parsed.getTime()) && parsed < new Date()) {
                dateWithYear = `${event.date} ${nextYear}`;
                parsed = new Date(dateWithYear);
            }
            
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        
        // Return a far future date if we can't parse anything (puts unparseable dates at the end)
        return new Date('2099-12-31');
    };

    // Function to show/hide loading skeletons
    const toggleLoading = (isLoading) => {
        const skeletons = document.querySelectorAll('.loading-skeleton');
        skeletons.forEach(s => s.style.display = isLoading ? 'block' : 'none');
        // When loading is true, hide the main content containers to show skeletons.
        // When loading is false, let renderNewsItems/renderEvents manage visibility.
        if (isLoading) {
            newsArticlesContainer.style.display = 'none';
            eventsCalendar.style.display = 'none';
        }
        // IMPORTANT: No 'else' block here to set display to 'none'.
        // The render functions (renderNewsItems, renderEvents) will explicitly
        // set the correct 'display' style ('grid' or 'block') when data is ready.

        errorMessage.style.display = 'none';
        noResultsMessage.style.display = 'none';
    };

    // Function to display error message
    const displayError = (message = 'Failed to load content. Please try again later.') => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        newsArticlesContainer.innerHTML = ''; // Clear content
        eventList.innerHTML = '';
        newsArticlesContainer.style.display = 'none';
        eventsCalendar.style.display = 'none';
        pageNumbersContainer.innerHTML = '';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
    };

    // Function to display no results message
    const displayNoResults = () => {
        noResultsMessage.style.display = 'block';
        newsArticlesContainer.innerHTML = ''; // Clear content
        eventList.innerHTML = '';
        newsArticlesContainer.style.display = 'none';
        eventsCalendar.style.display = 'none';
        pageNumbersContainer.innerHTML = '';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
    };

    // Function to render news articles
    const renderNewsItems = (items) => {
        newsArticlesContainer.innerHTML = ''; // Clear previous content
        eventsCalendar.style.display = 'none';
        newsArticlesContainer.style.display = 'grid';

        if (items.length === 0) {
            displayNoResults();
            return;
        }

        items.forEach(item => {
            const newsItemDiv = document.createElement('div');
            newsItemDiv.classList.add('news-item');
            newsItemDiv.innerHTML = `
                <h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
                <time datetime="${item.date}">${formatDate(item.date)}</time>
                <p>${item.summary}</p>
                <p><small>Source: ${item.source}</small></p>
            `;
            newsArticlesContainer.appendChild(newsItemDiv);
        });
    };    // Function to render events
    const renderEvents = (events) => {
        eventList.innerHTML = ''; // Clear previous content
        newsArticlesContainer.style.display = 'none';
        eventsCalendar.style.display = 'block';

        if (events.length === 0) {
            eventList.innerHTML = '<li><p>No upcoming events.</p></li>';
            return;
        }        events.forEach(event => {
            const eventItemLi = document.createElement('li');
            eventItemLi.classList.add('event-item');
            eventItemLi.innerHTML = `
                <h4><a href="${event.url}" target="_blank" rel="noopener noreferrer">${event.title}</a></h4>
                <p class="event-date">Date: ${event.date}</p>
                ${event.date_range ? `<p class="event-date-range">Schedule: ${event.date_range}</p>` : ''}
                <p class="event-location">Location: ${event.location || 'N/A'}</p>
                <p>${event.summary}</p>
            `;
            eventList.appendChild(eventItemLi);
        });
    };

    // Function to update pagination controls
    const updatePagination = (totalItems) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        pageNumbersContainer.innerHTML = '';
        
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

        // Display page numbers
        const maxPageButtons = 5; // Max number of page buttons to show
        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

        if (endPage - startPage + 1 < maxPageButtons) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }

        if (startPage > 1) {
            const span = document.createElement('span');
            span.textContent = '1';
            span.classList.add('page-num');
            span.addEventListener('click', () => goToPage(1));
            pageNumbersContainer.appendChild(span);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const span = document.createElement('span');
            span.textContent = i;
            span.classList.add('page-num');
            if (i === currentPage) {
                span.classList.add('active-page');
            }
            span.addEventListener('click', () => goToPage(i));
            pageNumbersContainer.appendChild(span);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
            const span = document.createElement('span');
            span.textContent = totalPages;
            span.classList.add('page-num');
            span.addEventListener('click', () => goToPage(totalPages));
            pageNumbersContainer.appendChild(span);
        }
    };    // Function to fetch and render data
    const fetchAndRenderData = async () => {
        toggleLoading(true);
        errorMessage.style.display = 'none';
        noResultsMessage.style.display = 'none';

        try {
            console.log('Fetching data for category:', currentCategory);
            let data = [];
              if (currentCategory === 'events') {                console.log('Querying events table...');
                // Query events table directly from Supabase
                let query = supabase
                    .from('events')
                    .select('*')
                    .order('date', { ascending: true }); // Order by date string
                
                console.log('Executing events query...');
                const { data: eventsData, error } = await query;
                
                console.log('Events query result:', { eventsData, error });
                
                if (error) {
                    throw new Error(`Supabase error: ${error.message}`);
                }
                
                data = eventsData || [];
                console.log('Events data loaded:', data.length, 'items');            } else {
                console.log('Querying articles table...');
                // Query articles table directly from Supabase for Loyalty News and Retail News
                let query = supabase
                    .from('articles')
                    .select('*')
                    .eq('category', currentCategory) // Filter by category (loyalty or retail)
                    .order('date', { ascending: false }); // Newest articles first
                
                console.log('Executing articles query for category:', currentCategory);
                const { data: articlesData, error } = await query;
                
                console.log('Articles query result:', { articlesData, error });
                
                if (error) {
                    throw new Error(`Supabase error: ${error.message}`);
                }
                
                data = articlesData || [];
                console.log('Articles data loaded:', data.length, 'items');
            }            
            // Store fetched data in cache, this is the 'deduplicated list' for client-side filtering
            if (currentCategory === 'events') {
                // For events, sort by extracted date (earliest first)
                allData[currentCategory] = data.sort((a, b) => {
                    const dateA = extractSortableDate(a);
                    const dateB = extractSortableDate(b);
                    return dateA - dateB;
                });
            } else {
                // For articles, sort by newest first
                allData[currentCategory] = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
            console.log('Data stored in cache for category:', currentCategory, allData[currentCategory].length, 'items');            // Apply search filter
            let filteredData = allData[currentCategory].filter(item => {
                if (!searchQuery) return true;
                const searchLower = searchQuery.toLowerCase();
                return (item.title && item.title.toLowerCase().includes(searchLower)) ||
                       (item.summary && item.summary.toLowerCase().includes(searchLower)) ||
                       (item.source && item.source.toLowerCase().includes(searchLower)) ||
                       (item.location && item.location.toLowerCase().includes(searchLower)) ||
                       (item.date_range && item.date_range.toLowerCase().includes(searchLower));
            });

            console.log('Filtered data:', filteredData.length, 'items');

            // Apply pagination
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            console.log('Paginated data:', paginatedData.length, 'items for page', currentPage);

            if (currentCategory === 'events') {
                renderEvents(paginatedData);
            } else {
                renderNewsItems(paginatedData);
            }
            updatePagination(filteredData.length);
            updateUrlAndSeo();

        } catch (error) {
            console.error('Error fetching data:', error);
            displayError(`Failed to load content: ${error.message}`);
        } finally {
            toggleLoading(false);
        }
    };    // Function to update URL and SEO meta tags
    const updateUrlAndSeo = () => {
        let path = `/news-events/${currentCategory}/`;
        let title = `${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} ${currentCategory === 'events' ? 'Calendar' : 'News'} - Pratik Padiya Portfolio`;
        let description = `Latest ${currentCategory} ${currentCategory === 'events' ? 'events' : 'news'} in the Loyalty and Retail industry.`;
        let canonicalUrl = `https://pratikpadiyaportfolio.netlify.app/news-events/${currentCategory}/`;
        let jsonLdContent = {};        if (currentPage > 1) {
            path += `page/${currentPage}/`;
            title += ` (Page ${currentPage})`;
            canonicalUrl = `https://pratikpadiyaportfolio.netlify.app/news-events/${currentCategory}/`; // Canonical points to first page
        }

        if (searchQuery) {
            path += `?search=${encodeURIComponent(searchQuery)}`;
            title += ` - Search: ${searchQuery}`;
            // Canonical on search pages should point to the non-search version
            canonicalUrl = `https://pratikpadiyaportfolio.netlify.app/news-events/${currentCategory}/`;
            if (currentPage > 1) {
                canonicalUrl += `page/${currentPage}/`; // Keep page number in canonical if search is on a paginated page
            }
        }
        
        history.pushState({ category: currentCategory, page: currentPage, query: searchQuery }, '', path);

        document.title = title;
        document.querySelector('meta[name="description"]').setAttribute('content', description);
        document.querySelector('meta[property="og:title"]').setAttribute('content', title);
        document.querySelector('meta[property="og:description"]').setAttribute('content', description);
        document.querySelector('meta[property="og:url"]').setAttribute('content', `https://pratikpadiyaportfolio.netlify.app${path}`);
        document.querySelector('meta[property="twitter:title"]').setAttribute('content', title);
        document.querySelector('meta[property="twitter:description"]').setAttribute('content', description);
        document.querySelector('meta[property="twitter:url"]').setAttribute('content', `https://pratikpadiyaportfolio.netlify.app${path}`);
        document.querySelector('link[rel="canonical"]').setAttribute('href', canonicalUrl);

        // JSON-LD structured data for news articles
        if (currentCategory !== 'events') {
            const articlesForSchema = allData[currentCategory].slice(0, 5).map(item => ({ // Take top 5 for schema
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                "headline": item.title,
                "image": item.imageUrl || "https://pratikpadiyaportfolio.netlify.app/path/to/default-news-image.jpg",
                "datePublished": item.date,
                "dateModified": item.date, // Assuming last modified is same as published
                "author": {
                    "@type": "Organization",
                    "name": item.source
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Pratik Padiya Portfolio",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "https://pratikpadiyaportfolio.netlify.app/path/to/your/logo.png"
                    }
                },
                "description": item.summary,
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": item.url
                },
                "url": item.url
            }));
            jsonLdContent = {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "name": title,
                "description": description,
                "mainEntity": articlesForSchema.length > 0 ? articlesForSchema : undefined
            };
        } else {
            const eventsForSchema = allData[currentCategory].slice(0, 5).map(item => ({
                "@context": "https://schema.org",
                "@type": "Event",
                "name": item.title,
                "startDate": item.date,
                "endDate": item.date, // Assuming single day event, adjust if needed
                "location": {
                    "@type": "Place",
                    "name": item.location || "Online",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "", // Add specific address if available
                        "addressLocality": item.location.split(',')[0].trim() || "", // Basic locality from location string
                        "addressRegion": "",
                        "postalCode": "",
                        "addressCountry": "Asia" // Generalizing based on prompt
                    }
                },
                "description": item.summary,
                "url": item.url,
                "performer": {
                    "@type": "Organization",
                    "name": item.source || "Various"
                },
                "offers": {
                    "@type": "Offer",
                    "price": "0", // Assuming free or no price specified
                    "priceCurrency": "USD",
                    "validFrom": item.date,
                    "url": item.url,
                    "availability": "https://schema.org/InStock"
                },
                "eventStatus": "https://schema.org/EventScheduled"
            }));
            jsonLdContent = {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "name": title,
                "description": description,
                "mainEntity": eventsForSchema.length > 0 ? eventsForSchema : undefined
            };
        }
        jsonLdSchema.textContent = JSON.stringify(jsonLdContent, null, 2);
    };

    // Pagination navigation
    const goToPage = (page) => {
        currentPage = page;
        fetchAndRenderData();
    };

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    });    nextPageBtn.addEventListener('click', () => {
        const totalItems = allData[currentCategory].filter(item => {
            if (!searchQuery) return true;
            const searchLower = searchQuery.toLowerCase();
            return (item.title && item.title.toLowerCase().includes(searchLower)) ||
                   (item.summary && item.summary.toLowerCase().includes(searchLower)) ||
                   (item.source && item.source.toLowerCase().includes(searchLower)) ||
                   (item.location && item.location.toLowerCase().includes(searchLower)) ||
                   (item.date_range && item.date_range.toLowerCase().includes(searchLower));
        }).length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    });

    // Event Listeners for toggle buttons
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentCategory = button.dataset.category;
            currentPage = 1; // Reset to first page on category change
            searchQuery = ''; // Clear search on category change
            searchInput.value = '';
            fetchAndRenderData();
        });
    });

    // Event Listeners for search
    searchButton.addEventListener('click', () => {
        searchQuery = searchInput.value.trim();
        currentPage = 1; // Reset to first page on search
        fetchAndRenderData();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchQuery = searchInput.value.trim();
            currentPage = 1;
            fetchAndRenderData();
        }
    });    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        // Only handle popstate if we're still on the news-events page
        if (window.location.pathname.includes('news-events')) {
            if (event.state) {
                currentCategory = event.state.category || 'loyalty';
                currentPage = event.state.page || 1;
                searchQuery = event.state.query || '';
                
                // Update UI to reflect state
                toggleButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.category === currentCategory) {
                        btn.classList.add('active');
                    }
                });
                searchInput.value = searchQuery;
                fetchAndRenderData(); // Re-fetch data based on history state
            } else {
                // Default state if history state is null (e.g., initial load or direct navigation)
                const urlPath = window.location.pathname;
                const parts = urlPath.split('/').filter(p => p); // Remove empty strings
                
                let categoryFromUrl = 'loyalty'; // Default category
                let pageFromUrl = 1;
                let queryFromUrl = '';

                if (parts.includes('news-events')) {
                    const newsEventsIndex = parts.indexOf('news-events');
                    if (parts[newsEventsIndex + 1]) {
                        const nextPart = parts[newsEventsIndex + 1];
                        if (['loyalty', 'retail', 'events'].includes(nextPart)) {
                            categoryFromUrl = nextPart;
                        }
                    }
                    if (parts.includes('page')) {
                        const pageIndex = parts.indexOf('page');
                        if (parts[pageIndex + 1]) {
                            pageFromUrl = parseInt(parts[pageIndex + 1]);
                        }
                    }
                    const urlParams = new URLSearchParams(window.location.search);
                    queryFromUrl = urlParams.get('search') || '';
                }

                currentCategory = categoryFromUrl;
                currentPage = pageFromUrl;
                searchQuery = queryFromUrl;

                toggleButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.category === currentCategory) {
                        btn.classList.add('active');
                    }
                });
                searchInput.value = searchQuery;
                fetchAndRenderData();
            }
        }
        // If we're not on news-events page, let the browser handle navigation normally
    });

    // Initialize the page
    const init = () => {
        document.getElementById('current-year').textContent = new Date().getFullYear();
        
        // Check URL for initial category/page/search
        const urlPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        
        const parts = urlPath.split('/').filter(p => p);
        if (parts.includes('news-events')) {
            const newsEventsIndex = parts.indexOf('news-events');            if (parts[newsEventsIndex + 1]) {
                const nextPart = parts[newsEventsIndex + 1];
                if (['loyalty', 'retail', 'events'].includes(nextPart)) {
                    currentCategory = nextPart;
                    document.querySelector(`.toggle-btn[data-category="${currentCategory}"]`).classList.add('active');
                }
            }
            if (parts.includes('page')) {
                const pageIndex = parts.indexOf('page');
                if (parts[pageIndex + 1]) {
                    currentPage = parseInt(parts[pageIndex + 1]);
                }
            }
            searchQuery = urlParams.get('search') || '';
            searchInput.value = searchQuery;
        } else {
            // Default to 'loyalty' and active button
            document.querySelector('.toggle-btn[data-category="loyalty"]').classList.add('active');
        }

        fetchAndRenderData();
    };

    init();
});