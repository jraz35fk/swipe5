import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    const { location, type } = req.query;

    // Step 1: Check Supabase for cached data
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('location', location)
        .eq('type', type)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000)); // 24-hour cache

    if (data?.length) {
        console.log("Using cached data from Supabase:", data);
        return res.status(200).json(data);
    }

    // Step 2: Fetch new data from APIs if not found in Supabase
    console.log("Fetching new data from APIs...");
    const apiData = await fetchFromAPIs(location, type);

    // Step 3: Store new API results in Supabase
    const { insertError } = await supabase.from('activities').insert(apiData);
    if (insertError) {
        console.error("Error saving to Supabase:", insertError);
    }

    return res.status(200).json(apiData);
}

// Function to fetch data from external APIs (Google, Yelp, Foursquare)
async function fetchFromAPIs(location, type) {
    // Example: Fetch from Google Places API
    const googleResponse = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&type=${type}&key=${process.env.GOOGLE_API_KEY}`);
    const googleData = await googleResponse.json();

    // Example: Fetch from Yelp API
    const yelpResponse = await fetch(`https://api.yelp.com/v3/businesses/search?location=${location}&categories=${type}`, {
        headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` }
    });
    const yelpData = await yelpResponse.json();

    // Merge results (adjust this logic if needed)
    const results = googleData.results.map(place => ({
        name: place.name,
        address: place.vicinity,
        rating: place.rating,
        source: 'Google',
        location,
        type
    })).concat(
        yelpData.businesses.map(place => ({
            name: place.name,
            address: place.location.address1,
            rating: place.rating,
            source: 'Yelp',
            location,
            type
        }))
    );

    return results;
}
