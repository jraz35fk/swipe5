import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function assignImage(activityName) {
    const imageMappings = {
        "Sailing Trip": `${process.env.SUPABASE_URL}/storage/v1/object/public/activity-images/sailing.png`,
        "Wine Tasting": `${process.env.SUPABASE_URL}/storage/v1/object/public/activity-images/wine.png`,
        "Hiking Adventure": `${process.env.SUPABASE_URL}/storage/v1/object/public/activity-images/hiking.png`,
        "Live Music": `${process.env.SUPABASE_URL}/storage/v1/object/public/activity-images/live-music.png`
    };

    return imageMappings[activityName] || `${process.env.SUPABASE_URL}/storage/v1/object/public/activity-images/default.png`;
}

export default async function handler(req, res) {
    const { location, type } = req.query;

    // Check Supabase for existing data
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('location', location)
        .eq('type', type)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000));

    if (data?.length) {
        return res.status(200).json(data);
    }

    // Fetch new data from APIs
    const apiData = await fetchFromAPIs(location, type);

    // Assign images to each activity
    const apiDataWithImages = apiData.map(activity => ({
        ...activity,
        image_url: assignImage(activity.name),
    }));

    // Store in Supabase
    await supabase.from('activities').insert(apiDataWithImages);

    return res.status(200).json(apiDataWithImages);
}
