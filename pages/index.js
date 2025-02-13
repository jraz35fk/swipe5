import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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
        <div>
            <h1>Places</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}
