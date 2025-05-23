# Enhanced Portfolio Website - News & Events Page

This project extends the existing Netlify-hosted portfolio (pratikpadiyaportfolio.netlify.app) with a dynamic "News & Events" page. It curates articles and blogs related to the Loyalty and Retail industries, and displays upcoming events across Asia.

## Features

-   **Toggle View:** Switch between "All News", "Loyalty News", "Retail News", "Blogs", and "Events".
-   **Data Curation:** Fetches articles and blogs from NewsData.io, NewsAPI.org, and specified RSS feeds. Simulates upcoming events.
-   **Deduplication:** Ensures unique articles/events by hashing `title + source + date`.
-   **Data Retention:** Articles are retained for up to 6 months; older articles and past events are automatically archived.
-   **Display:**
    -   Shows newest content first, 10 items per page with client-side pagination.
    -   Search bar to filter content on the current deduplicated list.
    -   Calendar widget for events.
-   **User Experience (UX):**
    -   Mobile-first responsive design.
    -   Loading skeletons for better perceived performance.
    -   Clear error states.
-   **Search Engine Optimization (SEO):**
    -   Unique URLs for paginated pages (e.g., `/news-events/retail/page/2`).
    -   Proper meta tags and Open Graph data.
    -   JSON-LD structured data for news articles/events.
    -   Canonical tags on paginated and search result pages.
    -   Optimized for fast load times.

## Technologies Used

-   **Frontend:** HTML, CSS, JavaScript
-   **Backend (Serverless):** Netlify Functions (Node.js)
-   **Database:** Supabase (PostgreSQL)
-   **External APIs:** NewsData.io, NewsAPI.org, RSS Feeds

## Setup and Local Development

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/enhanced_portfolio_website.git
    cd enhanced_portfolio_website
    ```

2.  **Install Dependencies:**
    Navigate into the `netlify/functions` directory and install Node.js dependencies for the functions.
    ```bash
    cd netlify/functions
    npm install @supabase/supabase-js node-fetch rss-parser
    cd ../../ # Go back to the root directory
    ```

3.  **Supabase Setup:**
    -   Go to [Supabase](https://supabase.com/) and create a new project.
    -   **Database Schema (SQL Editor):**
        Once your project is created, navigate to `SQL Editor` in the sidebar and run the following SQL queries to create your tables:

        **For `articles` table:**
        ```sql
        CREATE TABLE public.articles (
            id uuid DEFAULT gen_random_uuid() NOT NULL,
            title text NOT NULL,
            source text,
            date timestamp with time zone NOT NULL,
            url text NOT NULL,
            summary text,
            category text,
            type text,
            hash text NOT NULL,
            created_at timestamp with time zone DEFAULT now() NOT NULL,
            CONSTRAINT articles_hash_key UNIQUE (hash),
            PRIMARY KEY (id)
        );
        ```
        **For `events` table:**
        ```sql
        CREATE TABLE public.events (
            id uuid DEFAULT gen_random_uuid() NOT NULL,
            title text NOT NULL,
            date timestamp with time zone NOT NULL,
            location text,
            url text NOT NULL,
            summary text,
            category text,
            type text,
            source text,
            hash text NOT NULL,
            created_at timestamp with time zone DEFAULT now() NOT NULL,
            CONSTRAINT events_hash_key UNIQUE (hash),
            PRIMARY KEY (id)
        );
        ```

        **Create Indexes (Optional but Recommended for Performance):**
        Supabase automatically creates indexes for primary keys and unique constraints. For faster queries by date and category, you can add more:

        ```sql
        -- For articles by date (descending)
        CREATE INDEX articles_date_desc_idx ON public.articles USING btree (date DESC);

        -- For articles by category and date (descending)
        CREATE INDEX articles_category_date_desc_idx ON public.articles USING btree (category, date DESC);

        -- For events by date (ascending)
        CREATE INDEX events_date_asc_idx ON public.events USING btree (date ASC);
        ```
    -   **Get your API Keys:**
        -   Go to `Project Settings` (gear icon) -> `API` in your Supabase dashboard.
        -   Copy your `Project URL` and add it to your `.env` file as `SUPABASE_URL`.
        -   Copy your `anon public` key and add it to your `.env` file as `SUPABASE_ANON_KEY`.
        -   Copy your `service_role` key (secret, keep it safe!) and add it to your `.env` file as `SUPABASE_SERVICE_ROLE_KEY`. This key is crucial for your Netlify Functions to have full read/write/delete access.

4.  **Environment Variables:**
    Create a `.env` file in the root of your `enhanced_portfolio_website/` directory (same level as `netlify/` and `news-events/`). Copy the contents from `.env.example` and replace the placeholder values with your actual API keys.

    ```
    NEWSDATA_API_KEY=your_newsdata_api_key_here
    NEWSAPI_API_KEY=your_newsapi_api_key_here
    SUPABASE_URL=https://your-project-ref.supabase.co
    SUPABASE_ANON_KEY=your_public_anon_key_here
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
    ```

5.  **Run Locally (with Netlify CLI):**
    Ensure you have [Netlify CLI](https://docs.netlify.com/cli/get-started/) installed (`npm install -g netlify-cli`).
    ```bash
    netlify dev
    ```
    This will start a local development server, typically at `http://localhost:8888`. You can access the News & Events page at `http://localhost:8888/news-events/`. The Netlify Functions will be accessible at `http://localhost:8888/.netlify/functions/fetch-news` and `http://localhost:8888/.netlify/functions/cleanup-archive`.

## Deployment to Netlify

1.  **Link to Netlify Project:**
    If your project is not already linked to Netlify, run:
    ```bash
    netlify link
    ```
    Follow the prompts to connect to your existing Netlify site.

2.  **Set Environment Variables in Netlify:**
    Go to your Netlify site dashboard -> `Site settings` -> `Build & deploy` -> `Environment`.
    Add your `NEWSDATA_API_KEY`, `NEWSAPI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as environment variables.

3.  **Deploy to Production:**
    ```bash
    netlify deploy --prod
    ```
    This will deploy your site to `pratikpadiyaportfolio.netlify.app`. The News & Events page will be available at `pratikpadiyaportfolio.netlify.app/news-events/`.

## Netlify Scheduled Functions (Cron Jobs) Configuration

Netlify Scheduled Functions use `cron` syntax. You'll set these up in your Netlify site dashboard.

1.  Go to your Netlify site dashboard.
2.  Navigate to `Functions` -> `Scheduled Functions`.
3.  Click `Add scheduled function`.

    -   **For `fetch-news.js`:**
        -   **Function name:** `fetch-news`
        -   **Schedule:** `0 23 * * *`
            -   This cron expression means "At 23:00 UTC every day".
            -   Since Singapore Time (SGT) is UTC+8, 23:00 UTC is 7:00 AM SGT the next day. This ensures daily fetches at 7 AM SGT.

    -   **For `cleanup-archive.js`:**
        -   **Function name:** `cleanup-archive`
        -   **Schedule:** `0 23 28-31 * *`
            -   This cron expression means "At 23:00 UTC on day-of-month 28-31".
            -   The function itself includes logic to check if the current day is actually the last day of the month to ensure it runs only once on the last day. This is a common pattern for "last day of month" cron jobs when `L` is not supported.

## Usage

Once deployed, navigate to `https://pratikpadiyaportfolio.netlify.app/news-events/`.

-   Use the toggle buttons to switch between different content categories.
-   Enter keywords in the search bar and click "Search" (or press Enter) to filter results.
-   Use the "Previous" and "Next" buttons or click on page numbers to navigate through pages.

## Important Notes

-   **API Limits:** Be mindful of the API call limits for NewsData.io (500 calls/mo) and NewsAPI.org (100 calls/day). The daily cron job will consume these. If you need more frequent updates or higher volume, consider paid plans or alternative APIs.
-   **Supabase Costs:** Supabase has a generous free tier. Monitor your usage to stay within limits if your data volume or query load grows significantly.
-   **Security:** Never hardcode API keys directly into your frontend code or commit them to your repository. Always use environment variables managed by Netlify.
-   **Image Optimization:** The current implementation doesn't include image optimization. For production, consider using Netlify's image transformation features or a service like Cloudinary for faster image loading.
-   **RSS Feeds:** The provided RSS feeds are examples. You may want to replace them with more specific and relevant feeds for Loyalty and Retail.
-   **Events Data:** The events data is currently simulated. For a real-world application, you would need to integrate with dedicated event APIs (if available for your niche) or implement a manual content management system for event listings.