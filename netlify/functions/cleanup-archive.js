// netlify/functions/cleanup-archive.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
// Use the service role key for server-side functions that need full write/delete access.
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    // Ensure this is only triggered by a scheduled event
    if (!event.Records || event.Records[0].eventSource !== 'aws:events') {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'This function can only be invoked by a scheduled event.' })
        };
    }

    console.log('Running cleanup-archive cron job...');

    // Get the current date and calculate 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoISO = sixMonthsAgo.toISOString();

    // Get the current date and calculate yesterday (for events cleanup)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString();

    try {
        // 1. Clean up old articles (older than 6 months)
        const { count: articlesCount, error: articlesError } = await supabase
            .from('articles')
            .delete()
            .lt('date', sixMonthsAgoISO) // Delete articles where date is less than 6 months ago
            .limit(1000) // Add a limit to prevent deleting too many at once if there's a backlog
            .select('*', { count: 'exact' }); // Request count of deleted rows

        if (articlesError) {
            throw new Error(`Error deleting old articles: ${articlesError.message}`);
        }
        console.log(`Deleted ${articlesCount} old articles.`);

        // 2. Clean up past events (older than yesterday)
        const { count: eventsCount, error: eventsError } = await supabase
            .from('events')
            .delete()
            .lt('date', yesterdayISO) // Delete events where date is less than yesterday
            .limit(1000) // Add a limit
            .select('*', { count: 'exact' }); // Request count of deleted rows

        if (eventsError) {
            throw new Error(`Error deleting past events: ${eventsError.message}`);
        }
        console.log(`Deleted ${eventsCount} past events.`);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Cleanup successful!' })
        };

    } catch (error) {
        console.error('Error during cleanup:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Cleanup failed.', error: error.message })
        };
    }
};