import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase Configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    const { data, error } = await supabase.from("places").select("*");
    if (error) {
      console.error("Error fetching places:", error);
    } else {
      setPlaces(data);
    }
  };

  const removeTag = async (placeId, tagToRemove) => {
    const place = places.find(p => p.id === placeId);
    if (!place) return;

    const updatedTags = place.tags.filter(tag => tag !== tagToRemove);

    const { error } = await supabase
      .from("places")
      .update({ tags: updatedTags })
      .eq("id", placeId);

    if (error) {
      console.error("Error removing tag:", error);
    } else {
      fetchPlaces();
    }
  };

  const addTag = async (placeId) => {
    if (!newTag) return;

    const place = places.find(p => p.id === placeId);
    if (!place) return;

    const updatedTags = [...place.tags, newTag];

    const { error } = await supabase
      .from("places")
      .update({ tags: updatedTags })
      .eq("id", placeId);

    if (error) {
      console.error("Error adding tag:", error);
    } else {
      setNewTag("");
      fetchPlaces();
    }
  };

  return (
    <div className="app">
      <h1>Tag Editor</h1>
      <div className="place-list">
        {places.map(place => (
          <div key={place.id} className="place-card" onClick={() => setSelectedPlace(place)}>
            <h2>{place.name}</h2>
            <p>{place.description}</p>
          </div>
        ))}
      </div>

      {selectedPlace && (
        <div className="tag-editor">
          <h2>Editing Tags for {selectedPlace.name}</h2>
          <div className="tags">
            {selectedPlace.tags.map(tag => (
              <span key={tag} className="tag">
                {tag} <button onClick={() => removeTag(selectedPlace.id, tag)}>X</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add new tag"
          />
          <button onClick={() => addTag(selectedPlace.id)}>Add Tag</button>
          <button onClick={() => setSelectedPlace(null)}>Close</button>
        </div>
      )}

      <style jsx>{`
        .app {
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .place-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .place-card {
          border: 1px solid #ddd;
          padding: 10px;
          cursor: pointer;
        }
        .tag-editor {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 20px;
          border: 1px solid #ddd;
          z-index: 10;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .tag {
          background: #ddd;
          padding: 5px 10px;
          border-radius: 5px;
        }
        .tag button {
          margin-left: 5px;
          background: red;
          color: white;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
