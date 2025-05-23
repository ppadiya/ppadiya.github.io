// netlify/functions/fetch-news.js
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const crypto = require('crypto'); // For hashing
const Parser = require('rss-parser'); // For RSS feeds

// Initialize Supabase client
// Use the service role key for server-side functions as it bypasses Row Level Security (RLS)
// which is appropriate for a cron job and backend API endpoint.
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize RSS Parser
const parser = new Parser();

// API Keys
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const NEWSAPI_API_KEY = process.env.NEWSAPI_API_KEY;

// RSS Feeds for different categories
const RSS_FEEDS = {
    loyalty: [
        'https://loyalty360.org/feed',
        'https://thewisemarketer.com/feed'
    ],
    retail: [
        'https://www.retaildive.com/feeds/news/',
        'https://retailwire.com/feed'
    ],
    blogs: [
        'https://techcrunch.com/feed/', // General tech/business, might cover retail/loyalty
        'https://www.forbes.com/business/feed/' // General business
    ]
};

// Helper function to generate a unique hash for deduplication
const generateHash = (item) => {
    // Ensure all components are strings to avoid issues with null/undefined
    const str = `${item.title || ''}-${item.source || ''}-${item.date || ''}-${item.url || ''}`;
    return crypto.createHash('sha256').update(str).digest('hex');
};

// Helper to save/update article in Supabase
const saveArticle = async (article) => {
    const hash = generateHash(article);

    // Check if article with this hash already exists
    const { data: existingArticles, error: selectError } = await supabase
        .from('articles')
        .select('id')
        .eq('hash', hash);

    if (selectError) {
        console.error('Error checking existing article:', selectError.message);
        return;
    }

    if (existingArticles && existingArticles.length > 0) {
        console.log(`Article with hash ${hash} already exists: ${article.title}`);
        // Optionally update if data changes, but for news, we typically skip
    } else {
        // If not exists, insert it
        const { error: insertError } = await supabase
            .from('articles')
            .insert({
                title: article.title,
                source: article.source,
                date: article.date,
                url: article.url,
                summary: article.summary,
                category: article.category,
                type: article.type,
                hash: hash
            });

        if (insertError) {
            console.error('Error inserting new article:', insertError.message);
        } else {
            console.log(`Created new article: ${article.title}`);
        }
    }
};

// Helper to save/update event in Supabase
const saveEvent = async (event) => {
    const hash = generateHash(event);

    // Check if event with this hash already exists
    const { data: existingEvents, error: selectError } = await supabase
        .from('events')
        .select('id')
        .eq('hash', hash);

    if (selectError) {
        console.error('Error checking existing event:', selectError.message);
        return;
    }

    if (existingEvents && existingEvents.length > 0) {
        console.log(`Event with hash ${hash} already exists: ${event.title}`);
    } else {
        // If not exists, insert it
        const { error: insertError } = await supabase
            .from('events')
            .insert({
                title: event.title,
                date: event.date,
                location: event.location,
                url: event.url,
                summary: event.summary,
                category: event.category,
                type: event.type,
                source: event.source,
                hash: hash
            });

        if (insertError) {
            console.error('Error inserting new event:', insertError.message);
        } else {
            console.log(`Created new event: ${event.title}`);
        }
    }
};

// Fetch from NewsData.io
const fetchFromNewsDataIo = async (query, category) => {
    const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&qInTitle=${encodeURIComponent(query)}&language=en&size=10`; // Max 10 articles per call
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.results) {
            return data.results.map(item => ({
                title: item.title,
                source: item.source_id || 'NewsData.io',
                date: item.pubDate,
                url: item.link,
                summary: item.description || item.content?.substring(0, 200) + '...' || 'No summary available.',
                category: category,
                type: 'article'
            }));
        }
    } catch (error) {
        console.error(`Error fetching from NewsData.io for ${query}:`, error);
    }
    return [];
};

// Fetch from NewsAPI.org
const fetchFromNewsApiOrg = async (query, category) => {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWSAPI_API_KEY}`; // Max 20 articles per call
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.articles) {
            return data.articles.map(item => ({
                title: item.title,
                source: item.source.name || 'NewsAPI.org',
                date: item.publishedAt,
                url: item.url,
                summary: item.description || item.content?.substring(0, 200) + '...' || 'No summary available.',
                category: category,
                type: 'article'
            }));
        }
    } catch (error) {
        console.error(`Error fetching from NewsAPI.org for ${query}:`, error);
    }
    return [];
};

// Fetch from RSS Feeds
const fetchFromRss = async (feedUrl, category) => {
    try {
        const feed = await parser.parseURL(feedUrl);
        return feed.items.map(item => ({
            title: item.title,
            source: feed.title || new URL(feedUrl).hostname,
            date: item.isoDate || item.pubDate,
            url: item.link,
            summary: item.contentSnippet || item.description?.substring(0, 200) + '...' || 'No summary available.',
            category: category,
            type: 'blog' // RSS feeds are typically blogs/articles
        }));
    } catch (error) {
        console.error(`Error fetching from RSS feed ${feedUrl}:`, error);
    }
    return [];
};

// Simulate events for demonstration
const getSimulatedEvents = () => {
    const events = [];
    const today = new Date();

    for (let i = 0; i < 10; i++) { // Generate 10 upcoming events
        const eventDate = new Date(today);
        eventDate.setDate(today.getDate() + (i * 7) + 1); // Event every week
        const isLoyalty = i % 2 === 0;
        events.push({
            title: isLoyalty ? `Loyalty Summit Asia ${eventDate.getFullYear()} - Part ${i + 1}` : `Retail Tech Expo Asia ${eventDate.getFullYear()} - Session ${i + 1}`,
            date: eventDate.toISOString(),
            location: `Singapore Expo Hall ${i + 1}, Singapore` || `Online`,
            url: `https://example.com/event-${i + 1}`,
            summary: `Join industry leaders to discuss the future of ${isLoyalty ? 'customer loyalty' : 'retail technology'} in Asia.`,
            category: isLoyalty ? 'loyalty' : 'retail',
            type: 'event',
            source: 'Simulated Events'
        });
    }
    return events;
};


// Main handler for the Netlify Function
exports.handler = async (event, context) => {
    // Check if it's a scheduled event (cron job) or an HTTP request
    //temporarily disable this check for local testing
    if (event.Records && event.Records[0].eventSource === 'aws:events') {
    // TEMPORARY: For local testing, force cron logic
    //if (true) {
        // This is a scheduled event (cron job)
        console.log('Running fetch-news cron job...');
        try {
            let allFetchedArticles = [];
            let allFetchedEvents = [];

            // Fetch Loyalty News
            allFetchedArticles = allFetchedArticles.concat(
                await fetchFromNewsDataIo('loyalty program OR customer retention', 'loyalty'),
                await fetchFromNewsApiOrg('loyalty program OR customer retention', 'loyalty')
            );
            for (const feed of RSS_FEEDS.loyalty) {
                allFetchedArticles = allFetchedArticles.concat(await fetchFromRss(feed, 'loyalty'));
            }

            // Fetch Retail News
            allFetchedArticles = allFetchedArticles.concat(
                await fetchFromNewsDataIo('retail technology OR retail innovation', 'retail'),
                await fetchFromNewsApiOrg('retail technology OR retail innovation', 'retail')
            );
            for (const feed of RSS_FEEDS.retail) {
                allFetchedArticles = allFetchedArticles.concat(await fetchFromRss(feed, 'retail'));
            }

            // Fetch Blogs (general topics, but categorized)
            for (const feed of RSS_FEEDS.blogs) {
                allFetchedArticles = allFetchedArticles.concat(await fetchFromRss(feed, 'blogs'));
            }

            // Simulate Events
            allFetchedEvents = getSimulatedEvents();

            // Process and save articles
            for (const article of allFetchedArticles) {
                // Articles older than 6 months will be cleaned up by cleanup-archive cron.
                // For now, just save them.
                await saveArticle(article);
            }

            // Process and save events
            for (const eventItem of allFetchedEvents) {
                // Only save upcoming events (future or today)
                if (new Date(eventItem.date) >= new Date()) {
                    await saveEvent(eventItem);
                }
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'News and events fetched and stored successfully!' })
            };

        } catch (error) {
            console.error('Error during scheduled fetch:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Failed to fetch and store news and events.', error: error.message })
            };
        }
    } else {
        // This is an HTTP request from the frontend
        console.log('Serving news-events data via HTTP request...');
        const { category } = event.queryStringParameters;

        try {
            let results = [];
            let { data, error } = { data: [], error: null }; // Initialize data and error

            if (category === 'events') {
                // Fetch events from Supabase, filter for upcoming
                ({ data, error } = await supabase
                    .from('events')
                    .select('*')
                    .gte('date', new Date().toISOString()) // Only events from today onwards
                    .order('date', { ascending: true }) // Order by date ascending for events
                );
            } else if (category === 'all') {
                // Fetch all articles
                ({ data, error } = await supabase
                    .from('articles')
                    .select('*')
                    .order('date', { ascending: false }) // Newest first
                );
            } else {
                // Fetch articles by specific category
                ({ data, error } = await supabase
                    .from('articles')
                    .select('*')
                    .eq('category', category)
                    .order('date', { ascending: false }) // Newest first
                );
            }

            if (error) {
                throw new Error(error.message);
            }

            results = data;

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' // Adjust for production security
                },
                body: JSON.stringify(results)
            };

        } catch (error) {
            console.error('Error serving data:', error);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ message: 'Failed to retrieve news and events.', error: error.message })
            };
        }
    }
};