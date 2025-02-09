import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function getServerSideProps() {
  // Fetch all categories and places in a single round-trip (with sorting for consistent order)
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .order('ranking_score', { ascending: false });
  const { data: places, error: placeError } = await supabase
    .from('places')
    .select('*')
    .order('category_id')               // sort by category to group places
    .order('ranking_score', { ascending: false });  // within each category, sort by rank

  if (catError || placeError) {
    console.error(catError || placeError);
    return { props: { categories: [], places: [] } };
  }
  return { props: { categories, places } };
}

export default function HomePage({ categories, places }) {
  return (
    <main>
      <h1>Explore Baltimore Activities</h1>
      {categories.map(category => (
        <section key={category.id} style={{ marginBottom: '2rem' }}>
          <h2>{category.name}</h2>
          <ul>
            {places
              .filter(p => p.category_id === category.id)
              .map(place => (
                <li key={place.id}>
                  <strong>{place.name}</strong> – {place.description}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
