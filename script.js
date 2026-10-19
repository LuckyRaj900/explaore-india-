const MAP_DATA_URL = "./india-states-map.json";
const STORAGE_KEYS = {
  favorites: "bharatverse.favorites",
  itinerary: "bharatverse.itinerary"
};

const destinations = [
  { id: "rishikesh", name: "Rishikesh", state: "Uttarakhand", feeling: "River air & mountain mornings", category: "mountains", tag: "MOUNTAINS", season: "Oct – Mar", image: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=240&q=75", coords: [78.2676, 30.0869] },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", feeling: "Old streets, pink light", category: "culture", tag: "CULTURE", season: "Nov – Feb", image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=240&q=75", coords: [75.7873, 26.9124] },
  { id: "varkala", name: "Varkala", state: "Kerala", feeling: "Clifftops & the Arabian Sea", category: "coast", tag: "COAST", season: "Oct – Mar", image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=240&q=75", coords: [76.7163, 8.7379] },
  { id: "leh", name: "Leh", state: "Ladakh", feeling: "Big skies, quieter thoughts", category: "mountains", tag: "MOUNTAINS", season: "Jun – Sep", image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=240&q=75", coords: [77.5771, 34.1526] },
  { id: "hampi", name: "Hampi", state: "Karnataka", feeling: "Ancient stones, slow afternoons", category: "culture", tag: "CULTURE", season: "Nov – Feb", image: "https://images.unsplash.com/photo-1600100397608-f010b33a8d09?auto=format&fit=crop&w=240&q=75", coords: [76.4600, 15.3350] },
  { id: "majuli", name: "Majuli", state: "Assam", feeling: "River islands & a slower rhythm", category: "culture", tag: "SLOW TRAVEL", season: "Oct – Mar", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=240&q=75", coords: [94.2167, 27.0000] },
  { id: "gokarna", name: "Gokarna", state: "Karnataka", feeling: "Quiet coves & salty hair", category: "coast", tag: "COAST", season: "Oct – Mar", image: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=240&q=75", coords: [74.3188, 14.5479] }
];

const listElement = document.querySelector("#destination-list");
const searchInput = document.querySelector("#destination-search");
const mapStatus = document.querySelector("#map-status");
const mapSvg = document.querySelector("#india-map");
const stateShapes = document.querySelector("#state-shapes");
const mapMarkers = document.querySelector("#map-markers");
const toast = document.querySelector("#toast");
let activeFilter = "all";
let savedOnly = false;
let savedIds = readStorage(STORAGE_KEYS.favorites, []);
let mapBounds = null;
let toastTimer;

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch (error) {
    console.error(`Could not read ${key} from local storage.`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not save ${key} to local storage.`, error);
    showToast("Your browser couldn't save this change.");
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function renderDestinations() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const visible = destinations.filter((place) => {
    const matchesFilter = activeFilter === "all" || place.category === activeFilter;
    const matchesSaved = !savedOnly || savedIds.includes(place.id);
    const matchesQuery = !query || `${place.name} ${place.state} ${place.feeling} ${place.tag}`.toLocaleLowerCase().includes(query);
    return matchesFilter && matchesSaved && matchesQuery;
  });

  listElement.replaceChildren();
  document.querySelector("#results-count").textContent = `${visible.length.toString().padStart(2, "0")} PLACES`;
  document.querySelector("#results-label").textContent = savedOnly ? "YOUR SAVED PLACES" : query ? "SEARCH RESULTS" : "A FEW PLACES TO BEGIN";
  document.querySelector("#saved-count").textContent = savedIds.length;

  if (visible.length === 0) {
    const empty = document.createElement("p");
    empty.className = "no-results";
    empty.textContent = savedOnly ? "No saved places yet. Tap the heart beside a place to keep it close." : "Nothing here just yet. Try another search or filter.";
    listElement.append(empty);
    return;
  }

  for (const place of visible) {
    const item = document.createElement("article");
    item.className = "destination-item";
    const image = document.createElement("img");
    image.className = "destination-thumb";
    image.src = place.image;
    image.alt = "";
    image.loading = "lazy";
    const info = document.createElement("div");
    info.className = "destination-info";
    const heading = document.createElement("h3");
    heading.textContent = place.name;
    const description = document.createElement("p");
    description.textContent = place.feeling;
    const meta = document.createElement("div");
    meta.className = "destination-meta";
    const tag = document.createElement("span");
    tag.textContent = place.tag;
    const season = document.createElement("span");
    season.textContent = place.season;
    meta.append(tag, season);
    info.append(heading, description, meta);
    const save = document.createElement("button");
    save.className = `save-button${savedIds.includes(place.id) ? " saved" : ""}`;
    save.type = "button";
    save.setAttribute("aria-label", `${savedIds.includes(place.id) ? "Remove" : "Save"} ${place.name}`);
    save.setAttribute("aria-pressed", savedIds.includes(place.id));
    save.textContent = savedIds.includes(place.id) ? "♥" : "♡";
    save.addEventListener("click", () => toggleSaved(place.id));
    item.addEventListener("click", (event) => {
      if (!event.target.closest(".save-button")) selectDestination(place);
    });
    item.append(image, info, save);
    listElement.append(item);
  }
}

function toggleSaved(id) {
  const wasSaved = savedIds.includes(id);
  const next = wasSaved ? savedIds.filter((savedId) => savedId !== id) : [...savedIds, id];
  if (!writeStorage(STORAGE_KEYS.favorites, next)) return;
  savedIds = next;
  renderDestinations();
  updatePlannerStops();
  showToast(wasSaved ? "Place removed from your saved list." : "A place worth remembering. Saved.");
}

function selectDestination(place) {
  document.querySelectorAll(".state-shape.selected").forEach((shape) => shape.classList.remove("selected"));
  const matchingState = [...stateShapes.querySelectorAll(".state-shape")].find((shape) => shape.dataset.state?.toLocaleLowerCase() === place.state.toLocaleLowerCase());
  matchingState?.classList.add("selected");
  showToast(`${place.name}, ${place.state} — ${place.feeling}`);
}

function projectCoordinates(longitude, latitude, projection) {
  const x = projection.offsetX + (longitude - projection.minLng) * projection.scale;
  const y = projection.offsetY + (projection.maxLat - latitude) * projection.scale;
  return [x, y];
}

async function loadIndiaMap() {
  try {
    const response = await fetch(MAP_DATA_URL);
    if (!response.ok) throw new Error(`Map data request failed with HTTP ${response.status}.`);
    const mapData = await response.json();
    const projection = mapData.projection;
    if (!Array.isArray(mapData.states) || mapData.states.length === 0 || !projection) {
      throw new Error("Map data did not contain state boundaries and projection metadata.");
    }
    if (![projection.minLng, projection.maxLat, projection.scale, projection.offsetX, projection.offsetY].every(Number.isFinite)) {
      throw new Error("Map data contained invalid projection metadata.");
    }
    mapSvg.setAttribute("viewBox", mapData.viewBox);
    mapBounds = projection;

    const paths = [];
    for (const state of mapData.states) {
      if (typeof state.state !== "string" || typeof state.path !== "string") {
        throw new Error("Map data contains an invalid state boundary.");
      }
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("state-shape");
      path.dataset.state = state.state;
      path.setAttribute("d", state.path);
      path.setAttribute("aria-label", state.state);
      path.setAttribute("role", "button");
      path.setAttribute("tabindex", "0");
      path.addEventListener("click", () => selectState(state.state));
      path.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectState(state.state);
        }
      });
      paths.push(path);
    }
    stateShapes.replaceChildren(...paths);
    mapStatus.textContent = "";
    renderMapMarkers(projection);
  } catch (error) {
    console.error("India state boundaries could not be loaded.", error);
    mapStatus.textContent = "State boundaries unavailable — destinations are still listed below.";
  }
}

function selectState(state) {
  document.querySelectorAll(".state-shape.selected").forEach((shape) => shape.classList.remove("selected"));
  stateShapes.querySelectorAll(".state-shape").forEach((shape) => {
    if (shape.dataset.state === state) shape.classList.add("selected");
  });
  activeFilter = "all";
  savedOnly = false;
  searchInput.value = state;
  document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === "all"));
  document.querySelector("#saved-toggle").classList.remove("is-active");
  renderDestinations();
  showToast(`Exploring ${state}`);
}

function renderMapMarkers(bounds) {
  const svgBounds = mapSvg.getBoundingClientRect();
  const stageBounds = mapSvg.parentElement.getBoundingClientRect();
  const viewBox = mapSvg.viewBox.baseVal;
  const fragment = document.createDocumentFragment();
  for (const place of destinations) {
    const [x, y] = projectCoordinates(place.coords[0], place.coords[1], bounds);
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "map-marker";
    marker.style.left = `${svgBounds.left - stageBounds.left + (x / viewBox.width) * svgBounds.width}px`;
    marker.style.top = `${svgBounds.top - stageBounds.top + (y / viewBox.height) * svgBounds.height}px`;
    marker.setAttribute("aria-label", `Explore ${place.name}, ${place.state}`);
    marker.title = `${place.name}, ${place.state}`;
    marker.addEventListener("click", () => selectDestination(place));
    fragment.append(marker);
  }
  mapMarkers.replaceChildren(fragment);
}

function updatePlannerStops() {
  const selected = destinations.filter((place) => savedIds.includes(place.id));
  const stops = document.querySelector("#planner-stops");
  stops.textContent = selected.length ? selected.map((place) => `${place.name}, ${place.state}`).join("  ·  ") : "No stops saved yet — explore the map to add some.";
}

document.querySelectorAll(".filter-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter;
    savedOnly = false;
    document.querySelectorAll(".filter-chip").forEach((other) => other.classList.toggle("active", other === chip));
    document.querySelector("#saved-toggle").classList.remove("is-active");
    renderDestinations();
  });
});

searchInput.addEventListener("input", renderDestinations);
document.querySelector("#saved-toggle").addEventListener("click", (event) => {
  savedOnly = !savedOnly;
  event.currentTarget.classList.toggle("is-active", savedOnly);
  renderDestinations();
});

document.querySelectorAll(".collection-card").forEach((card) => {
  card.addEventListener("click", () => {
    activeFilter = card.dataset.collection;
    savedOnly = false;
    searchInput.value = "";
    document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === activeFilter));
    renderDestinations();
  });
});

document.querySelector(".map-reset").addEventListener("click", () => {
  document.querySelectorAll(".state-shape.selected").forEach((shape) => shape.classList.remove("selected"));
  searchInput.value = "";
  activeFilter = "all";
  savedOnly = false;
  document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === "all"));
  renderDestinations();
});

const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});
mainNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
}));

const plannerDialog = document.querySelector("#planner-dialog");
document.querySelectorAll(".planner-open, .trip-copy .button").forEach((button) => {
  button.addEventListener("click", (event) => {
    if (event.currentTarget.matches("a")) event.preventDefault();
    updatePlannerStops();
    if (typeof plannerDialog.showModal === "function") plannerDialog.showModal();
    else showToast("Trip planner dialogs are not supported in this browser.");
  });
});

document.querySelector("#trip-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const itinerary = {
    name: formData.get("name").trim(),
    date: formData.get("date"),
    budget: formData.get("budget"),
    stops: destinations.filter((place) => savedIds.includes(place.id)).map((place) => place.id)
  };
  if (!writeStorage(STORAGE_KEYS.itinerary, itinerary)) return;
  document.querySelector("#planner-message").textContent = "Your daydream is saved on this device. Keep exploring whenever you're ready.";
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});

window.addEventListener("resize", () => {
  if (mapBounds) renderMapMarkers(mapBounds);
});

renderDestinations();
updatePlannerStops();
loadIndiaMap();
