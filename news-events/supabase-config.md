# Supabase Configuration Setup

## Steps to Configure Supabase:

1. **Get your Supabase credentials** from your [Supabase Dashboard](https://app.supabase.com):
   - Go to Settings → API
   - Copy the **Project URL**
   - Copy the **anon public** key (NOT the service_role key)

2. **Update the HTML file** (`index.html` lines ~96-99):
   ```javascript
   const supabaseUrl = 'https://your-project-id.supabase.co'
   const supabaseKey = 'your-anon-public-key-here'
   ```

3. **Set up Row Level Security (RLS)** in Supabase:
   - Go to Authentication → Policies
   - Create policies for `articles` and `events` tables
   - Allow public read access:
   
   **For articles table:**
   ```sql
   CREATE POLICY "Enable read access for all users" ON "public"."articles"
   AS PERMISSIVE FOR SELECT
   TO public
   USING (true)
   ```
   
   **For events table:**
   ```sql
   CREATE POLICY "Enable read access for all users" ON "public"."events"
   AS PERMISSIVE FOR SELECT
   TO public
   USING (true)
   ```

## Benefits of This Implementation:

✅ **No more fetch3 errors** - Direct Supabase connection
✅ **Faster performance** - No Netlify function middleware
✅ **Real-time capabilities** - Can add subscriptions later
✅ **Simpler architecture** - Direct frontend to database
✅ **Better error handling** - Direct Supabase error messages
✅ **Automatic caching** - Supabase handles caching

## Security Notes:

- Using the **anon public key** is safe for frontend use
- RLS policies control what data can be accessed
- No sensitive operations are exposed
- Read-only access for public users

## Testing:

After configuration, test by:
1. Opening the news-events page
2. Switching between categories
3. Searching for content
4. Checking browser console for any errors
