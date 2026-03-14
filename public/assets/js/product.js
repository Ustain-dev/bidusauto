
const vehicleDetail = document.getElementById('vehicleDetail');
const params = new URLSearchParams(window.location.search);
const vehicleId = params.get('id');

let currentVehicle = null;
let countdownInterval = null;

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getAuctionStatus(vehicle) {
  const now = Date.now();
  const start = new Date(vehicle.auctionStart).getTime();
  const end = new Date(vehicle.auctionEnd).getTime();

  if (!vehicle.isVisible) return 'hidden';
  if (now < start) return 'scheduled';
  if (now > end) return 'ended';
  return 'live';
}

function formatCountdown(endDateString) {
  const end = new Date(endDateString).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00' };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0')
  };
}

function buildGallery(images, title) {
  const safeTitle = escapeHtml(title);
  const galleryImages = Array.isArray(images) ? images : [];
  const first = galleryImages.length ? `/images/${galleryImages[0]}` : '';

  const thumbs = galleryImages.map((imgKey, index) => {
    return `
      <img
        src="/images/${encodeURIComponent(imgKey)}"
        alt="${safeTitle} image ${index + 1}"
        class="${index === 0 ? 'active' : ''}"
        data-full="/images/${encodeURIComponent(imgKey)}"
      />
    `;
  }).join('');

  return `
    <div class="gallery-card">
      ${
        first
          ? `<img id="mainVehicleImage" class="main-vehicle-image" src="${first}" alt="${safeTitle}" />`
          : `<div class="main-vehicle-image vehicle-image placeholder">No Image</div>`
      }
      <div id="thumbnailGrid" class="thumbnail-grid">${thumbs}</div>
    </div>
  `;
}

function renderVehicle(vehicle) {
  const status = getAuctionStatus(vehicle);
  const currentBid = Number(vehicle.currentBid || vehicle.startingBid || 0);
  const minIncrement = Number(vehicle.minimumIncrement || 0);
  const minimumNextBid = currentBid + minIncrement;

  vehicleDetail.innerHTML = `
    <div class="vehicle-detail-grid">
      <div>
        ${buildGallery(vehicle.images || [], vehicle.title)}

        <div class="info-card" style="margin-top: 20px;">
          <h2>Description</h2>
          <p>${escapeHtml(vehicle.description || 'No description available.')}</p>
        </div>
      </div>

      <div>
        <div class="detail-card">
          <span class="status-badge status-${status}" style="position: static; display: inline-block; margin-bottom: 12px;">
            ${status}
          </span>

          <h1>${escapeHtml(vehicle.title)}</h1>
          <p class="vehicle-meta">${escapeHtml(vehicle.year)} • ${escapeHtml(vehicle.make)} • ${escapeHtml(vehicle.model)}</p>

          <div class="spec-grid">
            <div class="spec-item"><span class="label">Mileage</span><strong>${escapeHtml(vehicle.mileage || '')} km</strong></div>
            <div class="spec-item"><span class="label">Transmission</span><strong>${escapeHtml(vehicle.transmission || '')}</strong></div>
            <div class="spec-item"><span class="label">Fuel Type</span><strong>${escapeHtml(vehicle.fuelType || '')}</strong></div>
            <div class="spec-item"><span class="label">Condition</span><strong>${escapeHtml(vehicle.condition || '')}</strong></div>
          </div>

          <div class="countdown" id="countdownWrap">
            <div class="countdown-box"><div class="label">Days</div><strong id="cdDays">00</strong></div>
            <div class="countdown-box"><div class="label">Hours</div><strong id="cdHours">00</strong></div>
            <div class="countdown-box"><div class="label">Minutes</div><strong id="cdMinutes">00</strong></div>
            <div class="countdown-box"><div class="label">Seconds</div><strong id="cdSeconds">00</strong></div>
          </div>

          <div class="spec-grid">
            <div class="spec-item"><span class="label">Starting Bid</span><strong>$${Number(vehicle.startingBid || 0).toLocaleString()}</strong></div>
            <div class="spec-item"><span class="label">Current Bid</span><strong>$${currentBid.toLocaleString()}</strong></div>
            <div class="spec-item"><span class="label">Min Increment</span><strong>$${minIncrement.toLocaleString()}</strong></div>
            <div class="spec-item"><span class="label">Minimum Next Bid</span><strong>$${minimumNextBid.toLocaleString()}</strong></div>
          </div>
        </div>

        <div class="bid-card" style="margin-top: 20px;">
          <h2>Pre-Qualify Before Bidding</h2>

          <div class="notice notice-info">
            All bidders must complete a <strong>$20 deposit</strong> before they can bid on this vehicle.
          </div>

          <form id="prequalifyForm">
            <div class="form-group">
              <label class="label" for="fullName">Full Name</label>
              <input class="form-input" id="fullName" name="fullName" type="text" required />
            </div>

            <div class="form-group">
              <label class="label" for="email">Email</label>
              <input class="form-input" id="email" name="email" type="email" required />
            </div>

            <div class="form-group">
              <label class="label" for="phone">Phone</label>
              <input class="form-input" id="phone" name="phone" type="text" required />
            </div>

            <div class="form-group">
              <label class="label" for="identityNumber">ID / Passport Number</label>
              <input class="form-input" id="identityNumber" name="identityNumber" type="text" required />
            </div>

            <button class="btn btn-secondary" type="submit">Pay $20 Deposit & Pre-Qualify</button>
          </form>

          <div id="prequalifyMessage" style="margin-top: 12px;"></div>

          <hr style="margin: 24px 0; border-color: rgba(255,255,255,0.08);" />

          <form id="bidForm">
            <div class="form-group">
              <label class="label" for="bidderEmail">Approved Bidder Email</label>
              <input class="form-input" id="bidderEmail" name="bidderEmail" type="email" required />
            </div>

            <div class="form-group">
              <label class="label" for="bidAmount">Bid Amount</label>
              <input class="form-input" id="bidAmount" name="bidAmount" type="number" min="${minimumNextBid}" value="${minimumNextBid}" required />
            </div>

            <button class="btn btn-primary" type="submit">Submit Bid</button>
          </form>

          <div id="bidMessage" style="margin-top: 12px;"></div>
        </div>
      </div>
    </div>
  `;

  bindGallery();
  bindForms(vehicle);
  startCountdown(vehicle.auctionEnd);
}

function bindGallery() {
  const mainImage = document.getElementById('mainVehicleImage');
  const thumbs = document.querySelectorAll('#thumbnailGrid img');

  if (!mainImage || !thumbs.length) return;

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      thumbs.forEach((item) => item.classList.remove('active'));
      thumb.classList.add('active');
      mainImage.src = thumb.dataset.full;
    });
  });
}

function setMessage(targetId, type, text) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = `<div class="notice notice-${type}">${escapeHtml(text)}</div>`;
}

function bindForms(vehicle) {
  const prequalifyForm = document.getElementById('prequalifyForm');
  const bidForm = document.getElementById('bidForm');

  prequalifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      auctionId: vehicle.id,
      fullName: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      identityNumber: document.getElementById('identityNumber').value.trim(),
      depositAmount: 20
    };

    try {
      const res = await fetch('/api/prequalify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage('prequalifyMessage', 'error', data.error || 'Pre-qualification failed.');
        return;
      }

      setMessage('prequalifyMessage', 'success', data.message || 'Pre-qualification completed.');
      document.getElementById('bidderEmail').value = payload.email;
    } catch (error) {
      setMessage('prequalifyMessage', 'error', 'Pre-qualification request failed.');
    }
  });

  bidForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      auctionId: vehicle.id,
      email: document.getElementById('bidderEmail').value.trim(),
      bidAmount: Number(document.getElementById('bidAmount').value)
    };

    try {
      const res = await fetch('/api/place-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage('bidMessage', 'error', data.error || 'Bid failed.');
        return;
      }

      setMessage('bidMessage', 'success', data.message || 'Bid placed successfully.');
      await loadVehicle();
    } catch (error) {
      setMessage('bidMessage', 'error', 'Bid request failed.');
    }
  });
}

function startCountdown(endDateString) {
  if (countdownInterval) clearInterval(countdownInterval);

  function update() {
    const values = formatCountdown(endDateString);

    const days = document.getElementById('cdDays');
    const hours = document.getElementById('cdHours');
    const minutes = document.getElementById('cdMinutes');
    const seconds = document.getElementById('cdSeconds');

    if (!days || !hours || !minutes || !seconds) return;

    days.textContent = values.days;
    hours.textContent = values.hours;
    minutes.textContent = values.minutes;
    seconds.textContent = values.seconds;
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

async function loadVehicle() {
  if (!vehicleId) {
    vehicleDetail.innerHTML = `<div class="error-state">Missing vehicle ID.</div>`;
    return;
  }

  try {
    const res = await fetch(`/api/auction?id=${encodeURIComponent(vehicleId)}`);
    const data = await res.json();

    if (!res.ok) {
      vehicleDetail.innerHTML = `<div class="error-state">${escapeHtml(data.error || 'Vehicle not found.')}</div>`;
      return;
    }

    currentVehicle = data.vehicle;
    renderVehicle(currentVehicle);
  } catch (error) {
    vehicleDetail.innerHTML = `<div class="error-state">Failed to load vehicle.</div>`;
  }
}

loadVehicle();
