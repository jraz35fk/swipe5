import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [layer, setLayer] = useState(1);
  const [selectedPath, setSelectedPath] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState("taxonomy"); // "taxonomy" for categories, "places" for final layer
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTopLevelCategories();
  }, []);

  /** ========================== 
   *  Fetch Top-Level Categories 
   *  ========================== */
  const fetchTopLevelCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("taxonomy")
      .select("*")
      .is("parent_id", null)
      .order("id", { ascending: true });

    if (error) console.error("Error fetching top-level categories:", error);
    else {
      setCards(data);
      setCurrentIndex(0);
      setLayer(1);
      setMode("taxonomy");
    }
    setLoading(false);
  };

  /** ========================== 
   *  Fetch Subcategories or Places 
   *  ========================== */
  const fetchNextLayer = async (parentId, newLayer) => {
    setLoading(true);

    let { data: subcategories, error } = await supabase
      .from("taxonomy")
      .select("*")
      .eq("parent_id", parentId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching subcategories:", error);
      setLoading(false);
      return;
    }

    if (subcategories.length > 0) {
      // Move into subcategories
      setCards(subcategories);
      setCurrentIndex(0);
      setLayer(newLayer);
      setMode("taxonomy");
    } else {
      // No subcategories? Load Places
      fetchPlaces(parentId);
    }
    setLoading(false);
  };

  /** ========================== 
   *  Fetch Places
