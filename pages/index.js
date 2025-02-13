import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ✅ Use Vercel Environment Variables
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
    const [data, setData] = useState([]);

    useEffect(() => {
        async function fetchData() {
            const { data, error } = await supabase.from("places").select("*");
            if (data) setData(data);
        }
        fetchData();
    }, []);

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Welcome to Swipe5</h1>
            <h2>Places:</h2>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}
