// =====================
// COMBINED AVAILABILITY (Index page)
// - One calendar shows availability if either house is free
// - Min stay 3 nights
// - No prices
// =====================

const API_BASE = "https://pucisca-calendar.ask-plowman.workers.dev"; // same as booking.js
const MIN_NIGHTS = 3;

function parseISODate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nightsBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((b - a) / ms);
}

async function fetchBlocked(houseKey) {
  const res = await fetch(`${API_BASE}/availability?house=${encodeURIComponent(houseKey)}`);
  if (!res.ok) throw new Error(`Failed availability for ${houseKey}`);
  const data = await res.json();
  return new Set(data.blocked || []);
}

function rangeHitsBlocked(blockedSet, start, end) {
  // checks days in [start, end)
  const cursor = new Date(start);
  while (cursor < end) {
    if (blockedSet.has(toISODate(cursor))) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

function prettyAvail(whOk, ghOk) {
  if (whOk && ghOk) return "Both Houses Available";
  if (whOk) return "White House Available";
  if (ghOk) return "Glass House Available";
  return "No Availability";
}

async function initCombinedWidget(root) {
  const rangeEl = root.querySelector("[data-range]");
  const nightsEl = root.querySelector("[data-nights]");
  const availEl = root.querySelector("[data-availability]");

  const mailWH = root.querySelector("[data-mailto-wh]");
  const mailGH = root.querySelector("[data-mailto-gh]");

  if (!rangeEl || !nightsEl || !availEl) return;
  if (!window.flatpickr) {
    console.error("Flatpickr not loaded. Add the flatpickr script on index.html.");
    return;
  }

  nightsEl.textContent = "-";
  availEl.textContent = "-";

  // Load both calendars
  let blockedWH = new Set();
  let blockedGH = new Set();

  try {
    [blockedWH, blockedGH] = await Promise.all([fetchBlocked("WH"), fetchBlocked("GH")]);
  } catch (e) {
    console.warn(e);
    // fail-open: allow selection; availability result may be wrong until fetch works
  }

  // Combined disable: block only if BOTH houses are blocked on that date
  const isDateBlockedForBoth = (date) => {
    const iso = toISODate(date);
    return blockedWH.has(iso) && blockedGH.has(iso);
  };

  const fp = flatpickr(rangeEl, {
    mode: "range",
    minDate: "today",
    dateFormat: "Y-m-d",
    disable: [isDateBlockedForBoth],

    // 1. LEGG TIL DENNE: Sporer når kalenderen på forsiden åpnes
    onOpen: function() {
      gtag('event', 'calendar_open', {
        'house_type': 'Both Houses (Index)',
        'page_location': 'Homepage'
      });
    },

    onChange: function (selectedDates) {
      if (selectedDates.length < 2) {
        nightsEl.textContent = "-";
        availEl.textContent = "-";
        return;
      }

      const checkIn = selectedDates[0];
      const checkOut = selectedDates[1];
      const nights = nightsBetween(checkIn, checkOut);

      if (nights < MIN_NIGHTS) {
        fp.clear();
        alert(`Minimum stay is ${MIN_NIGHTS} nights.`);
        return;
      }

      const whOk = !rangeHitsBlocked(blockedWH, checkIn, checkOut);
      const ghOk = !rangeHitsBlocked(blockedGH, checkIn, checkOut);

      if (!whOk && !ghOk) {
        fp.clear();
        nightsEl.textContent = "-";
        availEl.textContent = "-";
        alert("Those dates aren’t available in either house. Please choose different dates.");
        return;
      }

      // 2. LEGG TIL DENNE: Sporer når noen finner ledige datoer på forsiden
      gtag('event', 'combined_availability_checked', {
        'nights': nights,
        'wh_available': whOk,
        'gh_available': ghOk
      });

      nightsEl.textContent = `${nights} nights`;
      availEl.textContent = prettyAvail(whOk, ghOk);
      
      // ... resten av koden din (mailto osv)

      // Update email links (include dates)
      const bodyBase =
        `Hello,\n\n` +
        `I would like to request a booking.\n\n` +
        `Check-in: ${toISODate(checkIn)}\n` +
        `Check-out: ${toISODate(checkOut)}\n` +
        `Nights: ${nights}\n\n` +
        `Number of guests:\n` +
        `Any notes:\n\n` +
        `Thank you!`;

      if (mailWH) {
        mailWH.style.display = whOk ? "inline-flex" : "none";
        if (whOk) {
          const subject = `Booking request - The White House`;
          mailWH.href =
            `mailto:Nicola@plowman.no?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyBase)}`;
        }
      }

      if (mailGH) {
        mailGH.style.display = ghOk ? "inline-flex" : "none";
        if (ghOk) {
          const subject = `Booking request - The Glass House`;
          mailGH.href =
            `mailto:Nicola@plowman.no?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyBase)}`;
        }
      }
    }
  });
}

// Init
document.querySelectorAll("[data-combined-booking]").forEach((el) => {
  initCombinedWidget(el);
});

(function lazyAvailabilityOnClick() {
  const input = document.querySelector("[data-range]");
  if (!input) return;

  let started = false;

  async function loadAvailability() {
    if (started) return;
    started = true;

    const [gh, wh] = await Promise.all([
      fetch("availability?house=GH", { credentials: "same-origin" }),
      fetch("availability?house=WH", { credentials: "same-origin" })
    ]);

    // const ghData = await gh.json();
    // const whData = await wh.json();
    // ...initialize calendar/render...
  }

  input.addEventListener("pointerdown", loadAvailability, { once: true });
  input.addEventListener("keydown", loadAvailability, { once: true }); // accessibility
})();