import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function uploadImage(filePath, fileName) {
    const fileBuffer = fs.readFileSync(filePath);

    const { data, error } = await supabase
        .storage
        .from('activity-images')
        .upload(fileName, fileBuffer, { contentType: 'image/png' });

    if (error) {
        console.error("Upload Error:", error);
        return null;
    }

    return `${process.env.SUPABASE_URL}/storage/v1/object/public/activity-images/${fileName}`;
}

// Example usage:
(async () => {
    const imagePath = './public/images/sailing.png'; // Change to your local image path
    const imageUrl = await uploadImage(imagePath, 'sailing.png');
    console.log("Uploaded Image URL:", imageUrl);
})();

