import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state for data and navigation
let categories = [], categoryParents = [], places = [];
let childrenMap = {}, placesByCategory = {};
let navigationStack = [];    // Stack of navigation contexts (for categories and places)
let selectionPath = [];      // Selected categories breadcrumb (for navigation display)
let currentContext = null;   // The current context (top of navigationStack)

// DOM elements for dynamic sections
let selectionStackContainer, currentCardContainer, finalMatchesContainer;
let selectedList, finalList;

// Initialize the app after DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  selectionStackContainer = document.getElementById('selection-stack') || document.createElement('div');
  currentCardContainer = document.getElementById('current-card') || document.createElement('div');
  finalMatchesContainer = document.getElementById('final-matches') || document.createElement('div');

  selectionStackContainer.id = 'selection-stack';
  currentCardContainer.id = 'current-card';
  finalMatchesContainer.id = 'final-matches';

  if (!document.getElementById('selection-stack')) document.body.appendChild(selectionStackContainer);
  if (!document.getElementById('current-card')) document.body.appendChild(currentCardContainer);
  if (!document.getElementById('final-matches')) document.body.appendChild(finalMatchesContainer);

  selectionStackContainer.style.display = 'none';
  finalMatchesContainer.style.display = 'none';

  const selectionHeading = document.createElement('h3');
  selectionHeading.textContent = 'Your Selections';
  selectionStackContainer.appendChild(selectionHeading);
  selectedList = document.createElement('div');
  selectionStackContainer.appendChild(selectedList);

  const finalHeading = document.createElement('h3');
  finalHeading.textContent = 'Final Matches';
  finalMatchesContainer.appendChild(finalHeading);
  finalList = document.createElement('div');
  finalMatchesContainer.appendChild(finalList);

  // Fetch categories, relationships, and places from Supabase
  const { data: cats, error: catError } = await supabase.from('categories').select('*');
  const { data: rels, error: relsError } = await supabase.from('category_parents').select('*');
  const { data: placesData, error: placesError } = await supabase.from('places').select('*');

  if (catError || relsError || placesError) {
    console.error('Error loading data from Supabase:', catError || relsError || placesError);
    return;
  }

  categories = cats || [];
  categoryParents = rels || [];
  places = placesData || [];

  const childIdSet = new Set(categoryParents.map(cp => cp.category_id));
  const topCategories = categories.filter(c => !childIdSet.has(c.id));

  childrenMap = {};
  categoryParents.forEach(rel => {
    const parentId = rel.parent_id;
    const childCat = categories.find(c => c.id === rel.category_id);
    if (!childCat) return;
    if 
