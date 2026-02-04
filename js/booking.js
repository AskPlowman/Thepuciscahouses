// =====================
// CONFIG
// =====================
const API_BASE = "https://pucisca-calendar.ask-plowman.workers.dev"; // <-- your Worker URL
const MIN_NIGHTS = 3;

// Seasonal pricing (edit if WH and GH differ)
const PRICES = {
  WH: [
    { from: "2026-05-01", to: "2026-06-05", nightly: 1500 },
    { from: "2026-06-06", to: "2026-06-30", nightly: 1400 },
    { from: "2026-07-01", to: "2026-09-14", nightly: 1900 },
    { from: "2026-09-15", to: "2026-11-01", nightly: 1500 }
  ],
  GH: [
    { from: "2026-05-01", to: "2026-06-05", nightly: 1500 },
    { from: "2026-06-06", to: "2026-06-30", nightly: 1400 },
    { from: "2026-07-01", to: "2026-09-14", nightly: 1900 },
    { from: "2026-09-15", to: "2026-11-01", nightly: 1500 }
  ]
};

// =====================
// HELPERS
// =====================
function parseISODate(value) {
  // value: "YYYY-MM-DD"
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

function nightlyRateFor(houseKey, date) {
  const rules = PRICES[houseKey] || [];
  for (const r of rules) {
    const from = parseISODate(r.from);
    const to = parseISODate(r.to);
    if (date >= from && date <= to) return r.nightly;
  }
  return 1200; // fallback off-season placeholder
}

function estimateTotal(houseKey, checkIn, checkOut) {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) return { nights: 0, total: 0, avg: 0 };

  let total = 0;
  let cursor = new Date(checkIn);

  for (let i = 0; i < nights; i++) {
    total += nightlyRateFor(houseKey, cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  return { nights, total, avg: Math.round(total / nights) };
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

// =====================
// INIT PER HOUSE PANEL
// =====================
async function initBookingWidget(root) {
  const houseKey = root.dataset.house; // "WH" or "GH"
  const rangeEl = root.querySelector("[data-range]");
  const nightsEl = root.querySelector("[data-nights]");
  const avgEl = root.querySelector("[data-avg]");
  const totalEl = root.querySelector("[data-total]");
  const mailBtn = root.querySelector("[data-mailto]");

  if (!rangeEl || !nightsEl || !avgEl || !totalEl) return;

  nightsEl.textContent = "-";
  avgEl.textContent = "-";
  totalEl.textContent = "-";

  let blockedSet;
  try {
    blockedSet = await fetchBlocked(houseKey);
  } catch (e) {
    console.warn(e);
    blockedSet = new Set(); // fails open (calendar still usable)
  }

  if (!window.flatpickr) {
    console.error("Flatpickr is not loaded. Make sure booking.html includes the flatpickr script.");
    return;
  }

  const fp = flatpickr(rangeEl, {
    mode: "range",
    minDate: "today",
    dateFormat: "Y-m-d",
    disable: [
      (date) => blockedSet.has(toISODate(date))
    ],
    onChange: function (selectedDates) {
      if (selectedDates.length < 2) {
        nightsEl.textContent = "-";
        avgEl.textContent = "-";
        totalEl.textContent = "-";
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

      if (rangeHitsBlocked(blockedSet, checkIn, checkOut)) {
        fp.clear();
        alert("That range includes unavailable dates. Please choose different dates.");
        return;
      }

      const { total, avg } = estimateTotal(houseKey, checkIn, checkOut);

      nightsEl.textContent = `${nights} nights`;
      avgEl.textContent = `~€${avg}/night`;
      totalEl.textContent = `€${total.toLocaleString("en-GB")}`;

      // Update mailto link with chosen dates + price
      if (mailBtn) {
        const houseName = houseKey === "WH" ? "The White House" : "The Glass House";
        const subject = `Booking request - ${houseName}`;
        const body =
          `Hello,\n\n` +
          `I would like to request a booking for ${houseName}.\n\n` +
          `Check-in: ${toISODate(checkIn)}\n` +
          `Check-out: ${toISODate(checkOut)}\n` +
          `Nights: ${nights}\n` +
          `Estimated total: €${total.toLocaleString("en-GB")}\n\n` +
          `Number of guests: \n` +
          `Any notes: \n\n` +
          `Thank you!`;

        mailBtn.href =
          `mailto:Nicola@plowman.no?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    }
  });
}

document.querySelectorAll("[data-booking]").forEach((el) => {
  initBookingWidget(el);
});