// pages/index.js
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with public URL and anon key from env variables.
// These MUST be configured in Vercel for the build and runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home({ items }) {
  // If we want to re-fetch or update data on the client (optional):
  const [data, setData] = useState(items);

  useEffect(() => {
    // Example: client-side re-fetch (optional, e.g., to refresh data or handle updates)
    const fetchData = async () => {
      const { data: newData, error } = await supabase
        .from('YourTableName')        // replace with your table
        .select('*');
      if (error) {
        console.error('Error fetching data:', error.message);
      } else {
        setData(newData);
      }
    };
    // You can call fetchData() on some interval or in response to an event if needed.
    // For initial page load, data is already populated via SSR props.
    // fetchData();
  }, []);

  return (
    <main>
      <h1>Supabase Data</h1>
      {!data ? (
        <p>Loading...</p>
      ) : data.length === 0 ? (
        <p>No data found.</p>
      ) : (
        <ul>
          {data.map(item => (
            <li key={item.id}>
              {JSON.stringify(item)}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// Fetch data from Supabase on each request (SSR). 
// For better performance, you could use getStaticProps with revalidate if data doesn't change often.
export async function getServerSideProps() {
  // Ensure the env variables are present
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are missing.");
    return { props: { items: [] } };
  }
  // Query Supabase for all rows in the table
  const { data: items, error } = await supabase
    .from('YourTableName')          // replace with your table name
    .select('*');
  if (error) {
    console.error('Supabase query error:', error.message);
    // You can decide how to handle errors: for now, return no items
    return { props: { items: [] } };
  }
  return {
    props: { items: items ?? [] },  // pass data to the page component as props
    // If using getStaticProps, you could add revalidate here
  };
}
