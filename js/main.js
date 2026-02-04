// Mobile menu toggle
const hamburger = document.querySelector("[data-hamburger]");
const mobileMenu = document.querySelector("[data-mobilemenu]");

if (hamburger && mobileMenu) {
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
  });
}

async function initLeafletMaps() {
  if (!window.L) return;

  let scrollTimeout;

  document.querySelectorAll(".mapWrap").forEach(async (wrap) => {
    const mapEl = wrap.querySelector(".map");
    const overlay = wrap.querySelector(".mapOverlay");
    if (!mapEl || !overlay) return;

    // 🚀 LOAD LEAFLET CSS ONLY WHEN MAP EXISTS
    await loadCSS("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");

    const lat = parseFloat(mapEl.dataset.lat);
    const lng = parseFloat(mapEl.dataset.lng);
    const zoom = parseInt(mapEl.dataset.zoom || "8", 10);
    const label = mapEl.dataset.label || "Location";

    const map = L.map(mapEl, {
      scrollWheelZoom: false
    }).setView([lat, lng], zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    L.marker([lat, lng]).addTo(map).bindPopup(label);

    // Disable interactions initially
    function disable() {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      if (map.tap) map.tap.disable();
    }

    function enable() {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      if (map.tap) map.tap.enable();
    }

    disable();

    // Show overlay while scrolling
    function showOverlay() {
      overlay.classList.add("is-visible");
    }

    function hideOverlay() {
      overlay.classList.remove("is-visible");
    }

    window.addEventListener("scroll", () => {
      showOverlay();
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(hideOverlay, 160);
    }, { passive: true });

    // Activate map on deliberate click
    overlay.addEventListener("click", () => {
      enable();
      overlay.remove();
      map.invalidateSize();
    }, { once: true });
  });
}

initLeafletMaps();

// ===== Photo Tour modal (Airbnb-ish) =====
(function initPhotoTour(){
  const tour = document.getElementById("photoTour");
  if (!tour) return;

  

   // --- Hide top bar on scroll down, show on scroll up (Safari-bounce safe) ---
  const TOP_EPS = 6;          // "near top" threshold
  const DELTA_EPS = 10;       // ignore tiny bounce deltas
  const HIDE_AFTER = 32;      // don't hide header until user has scrolled this far

  let lastY = 0;
  let ticking = false;

  function applyHeaderState(y) {
    // Clamp (Safari rubber-band can behave weirdly)
    y = Math.max(0, y);

    // Always show at/near top
    if (y <= TOP_EPS) {
      tour.classList.remove("is-scrolling-down");
      lastY = 0;
      return;
    }

    const delta = y - lastY;

    // Ignore tiny movements (bounce / jitter)
    if (Math.abs(delta) <= DELTA_EPS) return;

    // Only allow hiding after we are a bit down the page
    if (y < HIDE_AFTER) {
      tour.classList.remove("is-scrolling-down");
      lastY = y;
      return;
    }

    if (delta > 0) tour.classList.add("is-scrolling-down");   // scrolling down
    else tour.classList.remove("is-scrolling-down");          // scrolling up

    lastY = y;
  }

  function onTourScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        applyHeaderState(tour.scrollTop);
        ticking = false;
      });
    }
  }

  tour.addEventListener("scroll", onTourScroll, { passive: true });

  const openBtns = document.querySelectorAll("[data-open-tour]");
  const closeBtns = tour.querySelectorAll("[data-close-tour]");

    function openTour(){
    tour.hidden = false;
    tour.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Ensure header is visible on open
    tour.classList.remove("is-scrolling-down");
    lastY = Math.max(0, tour.scrollTop);
  }



  function closeTour(){
    tour.hidden = true;
    tour.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

openBtns.forEach(btn => btn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  openTour();
}));

closeBtns.forEach(btn => btn.addEventListener("click", closeTour));

  // jump-to-section buttons
  tour.addEventListener("click", (e) => {
    const jump = e.target.closest("[data-tour-jump]");
    if (!jump) return;
    const sel = jump.getAttribute("data-tour-jump");
    const target = tour.querySelector(sel);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ESC closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !tour.hidden) closeTour();
  });

  // Let vertical wheel scroll escape while hovering the horizontal nav
  const nav = tour.querySelector("#tourNav");
  if (nav) {
    nav.addEventListener("wheel", (e) => {
      const canScrollX = nav.scrollWidth > nav.clientWidth + 1;
      if (!canScrollX) return;

      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      // If it's mostly vertical input, try to scroll nav sideways.
      // If nav can't move (at an edge), allow normal vertical scroll.
      if (absY > absX) {
        const prev = nav.scrollLeft;
        nav.scrollLeft += e.deltaY;

        // Only prevent default if the nav actually moved horizontally
        if (nav.scrollLeft !== prev) {
          e.preventDefault();
        }
      }
    }, { passive: false });
  }
})();

// About section toggle
(function initAboutToggle(){
  const card = document.getElementById("about-white-house");
  if(!card) return;

  const content = card.querySelector("#aboutContent");
  const toggles = card.querySelectorAll("[data-about-toggle]");
  const readMoreBtn = card.querySelector(".aboutToggle:not(.aboutToggle--close)");

  function setOpen(open){
  content.hidden = !open;

  if(readMoreBtn){
    readMoreBtn.style.display = open ? "none" : "inline-block";
    readMoreBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
}

  toggles.forEach(btn => {
    btn.addEventListener("click", () => {
      setOpen(content.hidden);
    });
  });
})();

// Start reviews carousel on item #4
(function initReviewsStartPosition(){
  const viewport = document.querySelector(".carousel-viewport");
  const cards = document.querySelectorAll(".review-card");

  if (!viewport || cards.length < 4) return;

  // Wait for layout so widths are correct
  requestAnimationFrame(() => {
    const target = cards[2]; // 0-based → 4th review
    const left = target.offsetLeft;

    viewport.scrollTo({
      left,
      behavior: "instant" // no animation on load
    });
  });
})();

(function lockReviewsToButtonsOnly(){
  const viewport = document.querySelector(".carousel-viewport");
  if (!viewport) return;
})();

(function initPreviewGalleryLazy() {
  const root = document.querySelector("[data-pg]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll(".pgSlide"));
  if (!slides.length) return;

  function hydratePicture(slideEl) {
    const pic = slideEl.querySelector("picture");
    if (!pic || pic.dataset.hydrated === "1") return;

    pic.querySelectorAll("source").forEach((s) => {
      if (s.dataset.srcset) s.srcset = s.dataset.srcset;
    });

    const img = pic.querySelector("img");
    if (img && img.dataset.src) img.src = img.dataset.src;

    pic.dataset.hydrated = "1";
  }

  // Always load first slide immediately
  hydratePicture(slides[0]);

  // Load neighbor slides (so transitions feel instant)
  function loadAround(index) {
    hydratePicture(slides[index]);
    if (slides[index + 1]) hydratePicture(slides[index + 1]);
    if (slides[index - 1]) hydratePicture(slides[index - 1]);
  }

  // Detect current slide by which one is most visible in the viewport
  const viewport = root.querySelector(".pgViewport");
  const track = root.querySelector(".pgTrack");
  if (!viewport || !track) return;

  let current = 0;

  const io = new IntersectionObserver((entries) => {
    // pick the most visible slide
    let best = current;
    let bestRatio = 0;

    for (const e of entries) {
      if (!e.isIntersecting) continue;
      if (e.intersectionRatio > bestRatio) {
        bestRatio = e.intersectionRatio;
        best = slides.indexOf(e.target);
      }
    }

    if (best !== -1 && best !== current) {
      current = best;
      loadAround(current);
    }
  }, { root: viewport, threshold: [0.25, 0.5, 0.75] });

  slides.forEach((s) => io.observe(s));

  // Also load around on arrow clicks (if your slider changes without scroll)
  const prevBtn = root.querySelector(".pgArrow.prev");
  const nextBtn = root.querySelector(".pgArrow.next");

  function onNavClick() {
    // after your slider moves, IO will usually fire; this is a safety fallback
    loadAround(current);
  }

  prevBtn?.addEventListener("click", onNavClick);
  nextBtn?.addEventListener("click", onNavClick);
})();

function loadCSS(href) {
  return new Promise((res) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = () => res();
    document.head.appendChild(l);
  });
}

let glCssLoaded = false;
function loadCSSOnce(href) {
  return new Promise((res) => {
    if (glCssLoaded) return res();
    glCssLoaded = true;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = res;
    document.head.appendChild(l);
  });
}

document.addEventListener("click", async (e) => {
  const a = e.target.closest("a.glightbox");
  if (!a) return;

  await loadCSSOnce("https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css");

  // If you also lazy-load GLightbox JS, load it here too before opening.
}, { capture: true });