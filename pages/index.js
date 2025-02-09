import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state for data and navigation
let categories = [], categoryParents = [], places = [];
let childrenMap = {}, placesByCategory = {};
let navigationStack = [];    // stack of navigation contexts (for categories and places)
let selectionPath = [];      // currently selected categories (for breadcrumb/path display)
let currentContext = null;   // the current context (top of navigationStack)

// DOM elements for dynamic sections
let selectionStackContainer, currentCardContainer, finalMatchesContainer;
let selectedList, finalList;

// Initialize the app after DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  // Prepare containers for selection stack, current card, and final matches
  selectionStackContainer = document.getElementById('selection-stack') || document.createElement('div');
  currentCardContainer = document.getElementById('current-card') || document.createElement('div');
  finalMatchesContainer = document.getElementById('final-matches') || document.createElement('div');
  // Set IDs (for styling or future reference)
  selectionStackContainer.id = 'selection-stack';
  currentCardContainer.id = 'current-card';
  finalMatchesContainer.id = 'final-matches';
  // Append containers to body if they weren't in HTML
  if (!document.getElementById('selection-stack')) document.body.appendChild(selectionStackContainer);
  if (!document.getElementById('current-card')) document.body.appendChild(currentCardContainer);
  if (!document.getElementById('final-matches')) document.body.appendChild(finalMatchesContainer);
  // Initially hide the selection stack and final matches sections
  selectionStackContainer.style.display = 'none';
  finalMatchesContainer.style.display = 'none';
  // Add heading sections inside containers for clarity
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

  // Build maps for parent-child category relationships and category-to-places mapping
  const childIdSet = new Set(categoryParents.map(cp => cp.category_id));
  const topCategories = categories.filter(c => !childIdSet.has(c.id));  // categories that are never a child = top-level
  // Map parent_id -> list of child category objects
  childrenMap = {};
  categoryParents.forEach(rel => {
    const parentId = rel.parent_id;
    const childCat = categories.find(c => c.id === rel.category_id);
    if (!childCat) return;
    if (!childrenMap[parentId]) childrenMap[parentId] = [];
    childrenMap[parentId].push(childCat);
  });
  // Optionally sort child categories alphabetically for consistent order
  Object.values(childrenMap).forEach(childList => {
    childList.sort((a, b) => a.name.localeCompare(b.name));
  });
  // Map category_id -> list of place objects
  placesByCategory = {};
  places.forEach(p => {
    if (!placesByCategory[p.category_id]) placesByCategory[p.category_id] = [];
    placesByCategory[p.category_id].push(p);
  });
  // Sort places by score (descending) so higher-ranked activities appear first
  Object.values(placesByCategory).forEach(placeList => {
    placeList.sort((a, b) => (b.score || 0) - (a.score || 0));
  });

  // Start navigation with top-level categories
  navigationStack = [];
  navigationStack.push({ items: topCategories, index: 0, parentId: null, type: 'category' });
  currentContext = navigationStack[navigationStack.length - 1];
  // Show the first category card
  if (currentContext.items.length > 0) {
    showItem(currentContext.items[currentContext.index]);
  } else {
    currentCardContainer.innerHTML = '<p>No categories available.</p>';
  }
}

// Render a card for the given item (category or place)
function showItem(item) {
  // Clear any existing card and create a new one
  currentCardContainer.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';
  // Card content
  const content = document.createElement('div');
  content.className = 'card-content';
  content.textContent = item.name;
  card.appendChild(content);
  // Card action buttons
  const btnContainer = document.createElement('div');
  btnContainer.className = 'card-buttons';
  const yesBtn = document.createElement('button');
  yesBtn.textContent = 'YES';
  yesBtn.className = 'yes-btn';
  yesBtn.id = 'yes-button';
  const noBtn = document.createElement('button');
  noBtn.textContent = 'NO';
  noBtn.className = 'no-btn';
  noBtn.id = 'no-button';
  // Append YES then NO to have YES on the left, NO on the right
  btnContainer.appendChild(yesBtn);
  btnContainer.appendChild(noBtn);
  card.appendChild(btnContainer);
  currentCardContainer.appendChild(card);
  // Attach event handlers
  yesBtn.addEventListener('click', handleYes);
  noBtn.addEventListener('click', handleNo);
}

// YES button handler – select the current item
function handleYes() {
  const ctx = currentContext;
  const item = ctx.items[ctx.index];
  if (ctx.type === 'category') {
    // User chose this category – add to selection path UI
    selectionPath.push(item);
    addSelectionCard(item);
    // Drill down into this category
    const children = childrenMap[item.id] || [];
    if (children.length > 0) {
      // There are subcategories – go one level deeper
      navigationStack.push({ items: children, index: 0, parentId: item.id, type: 'category' });
    } else {
      // No subcategories – go to the places (activities) level for this category
      const placeList = placesByCategory[item.id] || [];
      navigationStack.push({ items: placeList, index: 0, parentId: item.id, type: 'place' });
    }
    currentContext = navigationStack[navigationStack.length - 1];
    if (currentContext.items.length > 0) {
      // Show the first subcategory or place
      showItem(currentContext.items[currentContext.index]);
    } else {
      // If there are no sub-items (edge case: category with no subcategories and no places)
      handleNo();
    }
  } else if (ctx.type === 'place') {
    // User selected a final activity – save it to Final Matches
    addFinalMatch(item);
    // Move to the next place in the list (if any)
    ctx.index++;
    if (ctx.index < ctx.items.length) {
      // Show the next suggestion in the same category
      currentContext = ctx;
      showItem(ctx.items[ctx.index]);
    } else {
      // No more places in this category – branch finished
      navigationStack.pop();  // remove the completed places context
      if (ctx.parentId !== null) {
        // Remove the category from the selection path (this branch is complete)
        if (selectedList.childNodes.length > 0) {
          selectedList.removeChild(selectedList.lastChild);
        }
        selectionPath.pop();
      }
      if (navigationStack.length === 0) {
        // No more categories to explore
        currentCardContainer.innerHTML = '<p>No more options available.</p>';
      } else {
        // Backtrack to the previous level and continue
        handleNo();
      }
    }
  }
}

// NO button handler – skip the current item
function handleNo() {
  if (navigationStack.length === 0) return;
  // Skip the current item in the current context
  let ctx = navigationStack[navigationStack.length - 1];
  ctx.index++;
  // If we've reached the end of this context, backtrack upward
  while (ctx.index >= ctx.items.length) {
    // Pop the finished context
    navigationStack.pop();
    if (ctx.parentId !== null) {
      // Remove the last selected category (no match found in that branch)
      if (selectedList.childNodes.length > 0) {
        selectedList.removeChild(selectedList.lastChild);
      }
      selectionPath.pop();
    }
    if (navigationStack.length === 0) {
      // No more contexts – all options exhausted
      currentCardContainer.innerHTML = '<p>No more options available.</p>';
      return;
    }
    // Move up to the parent context and skip its current item as well
    ctx = navigationStack[navigationStack.length - 1];
    ctx.index++;
  }
  // Update current context and show the next item in the new context
  currentContext = navigationStack[navigationStack.length - 1];
  showItem(currentContext.items[currentContext.index]);
}

// Helper to display a selected category in the "Your Selections" stack
function addSelectionCard(category) {
  if (selectionStackContainer.style.display === 'none') {
    selectionStackContainer.style.display = 'block';
  }
  const card = document.createElement('div');
  card.className = 'card selected-card';
  card.textContent = category.name;
  selectedList.appendChild(card);
}

// Helper to display a chosen final activity in the Final Matches area
function addFinalMatch(place) {
  if (finalMatchesContainer.style.display === 'none') {
    finalMatchesContainer.style.display = 'block';
  }
  const finalItem = document.createElement('div');
  finalItem.className = 'final-item';
  finalItem.textContent = place.name;
  finalList.appendChild(finalItem);
}
