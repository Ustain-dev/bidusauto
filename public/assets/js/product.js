const vehicleDetail = document.getElementById('vehicleDetail');
const params = new URLSearchParams(window.location.search);
const vehicleId = params.get('id');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildGallery(images, title) {
  const safeTitle = escapeHtml(title);
  const galleryImages = Array.isArray(images) ? images : [];
  const first = galleryImages.length ? `/images/${galleryImages[0]}` : '';

  const thumbs = galleryImages.length
    ? galleryImages.map((imgKey, index) => {
        return `
          <img
            src="/images/${encodeURIComponent(imgKey)}"
            alt="${safeTitle} image ${index + 1}"
            class="${index === 0 ? 'active' : ''}"
            data-full="/images/${encodeURIComponent(imgKey)}"
          />
        `;
      }).join('')
    : `
      <div class="thumb-placeholder"></div>
      <div class="thumb-placeholder"></div>
      <div class="thumb-placeholder"></div>
      <div class="thumb-placeholder"></div>
      <div class="thumb-placeholder"></div>
    `;

  return `
    <div class="vehicle-gallery-card">
      ${
        first
          ? `<img id="mainVehicleImage" class="main-vehicle-image" src="${first}" alt="${safeTitle}" />`
          : `<div class="main-vehicle-image vehicle-image placeholder"><div class="car-illustration"></div></div>`
      }
      <div id="thumbnailGrid" class="thumbnail-grid">${thumbs}</div>
    </div>
  `;
}

function renderVehicle(vehicle) {
  const currentBid = Number(vehicle.currentBid || vehicle.startingBid || 0);
  const minIncrement = Number(vehicle.minimumIncrement || 0);
  const minimumNextBid = currentBid + minIncrement;

  vehicleDetail.innerHTML = `
    <div class="vehicle-detail-grid">
      <div>
        ${buildGallery(vehicle.images || [], vehicle.title)}
      </div>

      <div>
        <div class="vehicle-side-card">
          <p class="eyebrow">Live Auction</p>
          <h1>${escapeHtml(vehicle.title)}</h1>
          <p class="vehicle-copy">${escapeHtml(vehicle.description || 'Premium vehicle auction listing.')}</p>

          <div class="spec-grid">
            <div class="spec-item">
              <span class="label">Year</span>
              <strong>${escapeHtml(vehicle.year)}</strong>
            </div>
            <div class="spec-item">
              <span class="label">Mileage</span>
              <strong>${Number(vehicle.mileage || 0).toLocaleString()} km</strong>
            </div>
            <div class="spec-item">
              <span class="label">Transmission</span>
              <strong>${escapeHtml(vehicle.transmission || '')}</strong>
            </div>
            <div class="spec-item">
              <span class="label">Fuel</span>
              <strong>${escapeHtml(vehicle.fuelType || '')}</strong>
            </div>
          </div>

          <div class="price-summary-grid">
            <div class="spec-item">
              <span class="label">Starting Bid</span>
              <strong>$${Number(vehicle.startingBid || 0).toLocaleString()}</strong>
            </div>
            <div class="spec-item">
              <span class="label">Current Bid</span>
              <strong>$${currentBid.toLocaleString()}</strong>
            </div>
          </div>

          <div class="bid-panel">
            <h3>Pre-Qualify Before Bidding</h3>
            <p>
              All bidders must complete a <strong>$44.44 refundable deposit</strong> before they can place bids.
              Once verified, the bidder can submit bids above the minimum next bid.
            </p>

            <form id="prequalifyForm">
              <div class="form-group">
                <input class="form-input" id="fullName" name="fullName" type="text" placeholder="John Doe" required />
              </div>

              <div class="form-group">
                <input class="form-input" id="email" name="email" type="email" placeholder="john@example.com" required />
              </div>

              <div class="form-group">
                <input class="form-input" id="identityNumber" name="identityNumber" type="text" placeholder="ID / Passport Number" required />
              </div>

              <div class="form-group">
                <input class="form-input" id="phone" name="phone" type="text" placeholder="Phone Number" required />
              </div>

              <div class="form-group">
                <input class="form-input" id="depositAmountDisplay" type="text" value="$44.44 Fixed Deposit" readonly />
              </div>

              <button class="btn btn-secondary" type="submit">Pay $44.44 Deposit</button>
            </form>

            <div id="prequalifyMessage" style="margin-top:12px;"></div>

            <div class="form-group" style="margin-top: 16px;">
              <input class="form-input" id="bidAmount" name="bidAmount" type="number" value="${minimumNextBid}" />
            </div>

            <button class="btn btn-primary" id="submitBidButton" type="button">Submit Bid After Approval</button>
            <div id="bidMessage" style="margin-top:12px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindGallery();
  bindForms(vehicle);
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
  const submitBidButton = document.getElementById('submitBidButton');

  prequalifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      auctionId: vehicle.id,
      fullName: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      identityNumber: document.getElementById('identityNumber').value.trim(),
      depositAmount: 44.44
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
    } catch (error) {
      setMessage('prequalifyMessage', 'error', 'Pre-qualification request failed.');
    }
  });

  submitBidButton.addEventListener('click', async () => {
    const payload = {
      auctionId: vehicle.id,
      email: document.getElementById('email').value.trim(),
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

    renderVehicle(data.vehicle);
  } catch (error) {
    vehicleDetail.innerHTML = `<div class="error-state">Failed to load vehicle.</div>`;
  }
}

loadVehicle();
