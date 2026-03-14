
const vehicleForm = document.getElementById('vehicleForm');
const saveMessage = document.getElementById('saveMessage');
const refreshVehiclesBtn = document.getElementById('refreshVehiclesBtn');
const adminVehiclesList = document.getElementById('adminVehiclesList');
const setAdminKeyBtn = document.getElementById('setAdminKeyBtn');
const vehicleImagesInput = document.getElementById('vehicleImages');
const uploadedImagesContainer = document.getElementById('uploadedImages');

let uploadedImageKeys = [];

function getAdminKey() {
  return localStorage.getItem('bidusauto_admin_key') || '';
}

function setAdminKey() {
  const current = getAdminKey();
  const nextKey = window.prompt('Enter admin key', current);
  if (nextKey !== null) {
    localStorage.setItem('bidusauto_admin_key', nextKey.trim());
  }
}

function showMessage(type, message) {
  saveMessage.innerHTML = `<div class="notice notice-${type}">${message}</div>`;
}

function formatDatetimeLocalToIso(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toISOString();
}

async function uploadSelectedImages() {
  const files = Array.from(vehicleImagesInput.files || []);

  if (!files.length) {
    return [];
  }

  if (files.length > 20) {
    showMessage('error', 'You can upload a maximum of 20 images.');
    return [];
  }

  const results = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'x-admin-key': getAdminKey()
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Image upload failed.');
    }

    results.push(data.key);
  }

  return results;
}

function renderUploadedImages() {
  uploadedImagesContainer.innerHTML = uploadedImageKeys.map((key) => {
    return `<div class="item">${key}</div>`;
  }).join('');
}

vehicleImagesInput.addEventListener('change', async () => {
  try {
    showMessage('success', 'Uploading images...');
    const keys = await uploadSelectedImages();
    uploadedImageKeys = [...uploadedImageKeys, ...keys].slice(0, 20);
    renderUploadedImages();
    showMessage('success', 'Images uploaded successfully.');
    vehicleImagesInput.value = '';
  } catch (error) {
    showMessage('error', error.message || 'Upload failed.');
  }
});

setAdminKeyBtn.addEventListener('click', setAdminKey);

vehicleForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const payload = {
      id: document.getElementById('id').value.trim(),
      title: document.getElementById('title').value.trim(),
      make: document.getElementById('make').value.trim(),
      model: document.getElementById('model').value.trim(),
      year: Number(document.getElementById('year').value),
      mileage: Number(document.getElementById('mileage').value || 0),
      transmission: document.getElementById('transmission').value.trim(),
      fuelType: document.getElementById('fuelType').value.trim(),
      condition: document.getElementById('condition').value.trim(),
      description: document.getElementById('description').value.trim(),
      images: uploadedImageKeys,
      videoUrl: document.getElementById('videoUrl').value.trim(),
      startingBid: Number(document.getElementById('startingBid').value),
      minimumIncrement: Number(document.getElementById('minimumIncrement').value),
      auctionStart: formatDatetimeLocalToIso(document.getElementById('auctionStart').value),
      auctionEnd: formatDatetimeLocalToIso(document.getElementById('auctionEnd').value),
      isVisible: document.getElementById('isVisible').value === 'true',
      isFeatured: document.getElementById('isFeatured').value === 'true',
      depositRequired: Number(document.getElementById('depositRequired').value || 20)
    };

    const res = await fetch('/api/admin/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': getAdminKey()
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage('error', data.error || 'Failed to save vehicle.');
      return;
    }

    showMessage('success', data.message || 'Vehicle saved successfully.');
    loadVehicles();
  } catch (error) {
    showMessage('error', error.message || 'Failed to save vehicle.');
  }
});

function vehicleItem(vehicle) {
  return `
    <div class="admin-vehicle-item">
      <h3>${vehicle.title}</h3>
      <p>${vehicle.year} • ${vehicle.make} • ${vehicle.model}</p>
      <p>Current Bid: $${Number(vehicle.currentBid || vehicle.startingBid || 0).toLocaleString()}</p>
      <p>Visible: ${vehicle.isVisible ? 'true' : 'false'} | Featured: ${vehicle.isFeatured ? 'true' : 'false'}</p>
      <p>ID: ${vehicle.id}</p>
    </div>
  `;
}

async function loadVehicles() {
  try {
    const res = await fetch('/api/content?admin=1', {
      headers: {
        'x-admin-key': getAdminKey()
      }
    });

    const data = await res.json();

    if (!res.ok) {
      adminVehiclesList.innerHTML = `<div class="notice notice-error">${data.error || 'Failed to load vehicles.'}</div>`;
      return;
    }

    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];

    if (!vehicles.length) {
      adminVehiclesList.innerHTML = `<div class="notice notice-success">No vehicles saved yet.</div>`;
      return;
    }

    adminVehiclesList.innerHTML = vehicles.map(vehicleItem).join('');
  } catch (error) {
    adminVehiclesList.innerHTML = `<div class="notice notice-error">Failed to load vehicles.</div>`;
  }
}

refreshVehiclesBtn.addEventListener('click', loadVehicles);

loadVehicles();
