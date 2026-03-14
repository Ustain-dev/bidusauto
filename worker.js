export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    if (pathname === '/api/content' && request.method === 'GET') {
      return handleGetContent(request, env);
    }

    if (pathname === '/api/auction' && request.method === 'GET') {
      return handleGetAuction(request, env);
    }

    if (pathname === '/api/prequalify' && request.method === 'POST') {
      return handlePrequalify(request, env);
    }

    if (pathname === '/api/place-bid' && request.method === 'POST') {
      return handlePlaceBid(request, env);
    }

    if (pathname === '/api/admin/save' && request.method === 'POST') {
      return handleAdminSave(request, env);
    }

    if (pathname === '/api/upload-image' && request.method === 'POST') {
      return handleUploadImage(request, env);
    }

    if (pathname.startsWith('/images/') && request.method === 'GET') {
      return handleGetImage(request, env);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-admin-key'
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

function getAdminKeyFromRequest(request) {
  return request.headers.get('x-admin-key') || '';
}

function requireAdmin(request, env) {
  const requestKey = getAdminKeyFromRequest(request);
  const validKey = env.ADMIN_KEY || '';

  if (!validKey) {
    throw new Error('ADMIN_KEY is not configured.');
  }

  if (!requestKey || requestKey !== validKey) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
}

function normalizeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getVehicles(env) {
  const raw = await env.CONTENT.get('vehicles');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveVehicles(env, vehicles) {
  await env.CONTENT.put('vehicles', JSON.stringify(vehicles));
}

async function getPrequalifications(env) {
  const raw = await env.CONTENT.get('prequalifications');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function savePrequalifications(env, items) {
  await env.CONTENT.put('prequalifications', JSON.stringify(items));
}

async function getBids(env) {
  const raw = await env.CONTENT.get('bids');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveBids(env, bids) {
  await env.CONTENT.put('bids', JSON.stringify(bids));
}

function computeAuctionStatus(vehicle) {
  const now = Date.now();
  const start = new Date(vehicle.auctionStart).getTime();
  const end = new Date(vehicle.auctionEnd).getTime();

  if (!vehicle.isVisible) return 'hidden';
  if (now < start) return 'scheduled';
  if (now > end) return 'ended';
  return 'live';
}

async function handleGetContent(request, env) {
  const url = new URL(request.url);
  const admin = url.searchParams.get('admin') === '1';

  const vehicles = await getVehicles(env);

  if (admin) {
    try {
      requireAdmin(request, env);
      return jsonResponse({ vehicles }, 200);
    } catch (error) {
      return jsonResponse({ error: error.message || 'Unauthorized' }, error.status || 401);
    }
  }

  const publicVehicles = vehicles.filter(vehicle => vehicle.isVisible);

  return jsonResponse({ vehicles: publicVehicles }, 200);
}

async function handleGetAuction(request, env) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return jsonResponse({ error: 'Missing auction id.' }, 400);
  }

  const vehicles = await getVehicles(env);
  const vehicle = vehicles.find(item => item.id === id);

  if (!vehicle) {
    return jsonResponse({ error: 'Auction not found.' }, 404);
  }

  if (!vehicle.isVisible) {
    return jsonResponse({ error: 'Auction is not public.' }, 404);
  }

  return jsonResponse({ vehicle }, 200);
}

async function handlePrequalify(request, env) {
  const body = await request.json();

  const auctionId = String(body.auctionId || '').trim();
  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const identityNumber = String(body.identityNumber || '').trim();
  const depositAmount = Number(body.depositAmount || 0);

  if (!auctionId || !fullName || !email || !phone || !identityNumber) {
    return jsonResponse({ error: 'Missing required pre-qualification fields.' }, 400);
  }

  if (depositAmount !== 20) {
    return jsonResponse({ error: 'Deposit amount must be exactly 20 USD.' }, 400);
  }

  const vehicles = await getVehicles(env);
  const vehicle = vehicles.find(item => item.id === auctionId);

  if (!vehicle) {
    return jsonResponse({ error: 'Auction not found.' }, 404);
  }

  const prequalifications = await getPrequalifications(env);

  const existingIndex = prequalifications.findIndex(
    item => item.auctionId === auctionId && item.email === email
  );

  const record = {
    auctionId,
    fullName,
    email,
    phone,
    identityNumber,
    depositAmount: 20,
    depositStatus: 'paid',
    approved: true,
    createdAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    prequalifications[existingIndex] = {
      ...prequalifications[existingIndex],
      ...record
    };
  } else {
    prequalifications.push(record);
  }

  await savePrequalifications(env, prequalifications);

  return jsonResponse({
    success: true,
    message: 'Deposit received. Bidder is pre-qualified and approved.',
    prequalification: record
  }, 200);
}

async function handlePlaceBid(request, env) {
  const body = await request.json();

  const auctionId = String(body.auctionId || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const bidAmount = Number(body.bidAmount || 0);

  if (!auctionId || !email || !bidAmount) {
    return jsonResponse({ error: 'Missing required bid fields.' }, 400);
  }

  const vehicles = await getVehicles(env);
  const vehicleIndex = vehicles.findIndex(item => item.id === auctionId);

  if (vehicleIndex === -1) {
    return jsonResponse({ error: 'Auction not found.' }, 404);
  }

  const vehicle = vehicles[vehicleIndex];
  const status = computeAuctionStatus(vehicle);

  if (status !== 'live') {
    return jsonResponse({ error: 'Bidding is only allowed on live auctions.' }, 400);
  }

  const prequalifications = await getPrequalifications(env);
  const approvedBidder = prequalifications.find(
    item => item.auctionId === auctionId && item.email === email && item.approved === true
  );

  if (!approvedBidder) {
    return jsonResponse({ error: 'Bidder is not pre-qualified for this auction.' }, 403);
  }

  const currentBid = Number(vehicle.currentBid || vehicle.startingBid || 0);
  const minimumIncrement = Number(vehicle.minimumIncrement || 0);
  const minimumNextBid = currentBid + minimumIncrement;

  if (bidAmount < minimumNextBid) {
    return jsonResponse({
      error: `Bid must be at least ${minimumNextBid}.`
    }, 400);
  }

  const bidRecord = {
    auctionId,
    email,
    bidAmount,
    createdAt: new Date().toISOString()
  };

  const bids = await getBids(env);
  bids.push(bidRecord);
  await saveBids(env, bids);

  vehicles[vehicleIndex] = {
    ...vehicle,
    currentBid: bidAmount,
    highestBidderEmail: email,
    updatedAt: new Date().toISOString()
  };

  await saveVehicles(env, vehicles);

  return jsonResponse({
    success: true,
    message: 'Bid placed successfully.',
    currentBid: bidAmount
  }, 200);
}

async function handleAdminSave(request, env) {
  try {
    requireAdmin(request, env);
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unauthorized' }, error.status || 401);
  }

  const body = await request.json();

  const id = normalizeId(body.id || body.title);
  const title = String(body.title || '').trim();
  const make = String(body.make || '').trim();
  const model = String(body.model || '').trim();
  const year = Number(body.year || 0);
  const mileage = Number(body.mileage || 0);
  const transmission = String(body.transmission || '').trim();
  const fuelType = String(body.fuelType || '').trim();
  const condition = String(body.condition || '').trim();
  const description = String(body.description || '').trim();
  const images = Array.isArray(body.images) ? body.images.slice(0, 20) : [];
  const videoUrl = String(body.videoUrl || '').trim();
  const startingBid = Number(body.startingBid || 0);
  const minimumIncrement = Number(body.minimumIncrement || 0);
  const auctionStart = String(body.auctionStart || '').trim();
  const auctionEnd = String(body.auctionEnd || '').trim();
  const isVisible = Boolean(body.isVisible);
  const isFeatured = Boolean(body.isFeatured);
  const depositRequired = Number(body.depositRequired || 20);

  if (!id || !title || !make || !model || !year || !auctionStart || !auctionEnd) {
    return jsonResponse({ error: 'Missing required vehicle fields.' }, 400);
  }

  const vehicles = await getVehicles(env);
  const existingIndex = vehicles.findIndex(item => item.id === id);

  const existing = existingIndex >= 0 ? vehicles[existingIndex] : null;

  const vehicle = {
    id,
    title,
    make,
    model,
    year,
    mileage,
    transmission,
    fuelType,
    condition,
    description,
    images,
    videoUrl,
    startingBid,
    currentBid: existing ? existing.currentBid : startingBid,
    minimumIncrement,
    auctionStart,
    auctionEnd,
    isVisible,
    isFeatured,
    depositRequired,
    updatedAt: new Date().toISOString(),
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  };

  if (existingIndex >= 0) {
    vehicles[existingIndex] = vehicle;
  } else {
    vehicles.push(vehicle);
  }

  await saveVehicles(env, vehicles);

  return jsonResponse({
    success: true,
    message: 'Vehicle saved successfully.',
    vehicle
  }, 200);
}

async function handleUploadImage(request, env) {
  try {
    requireAdmin(request, env);
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unauthorized' }, error.status || 401);
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return jsonResponse({ error: 'No file uploaded.' }, 400);
  }

  const fileExtension = getFileExtension(file.name);
  const key = `vehicles/${crypto.randomUUID()}.${fileExtension}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream'
    }
  });

  return jsonResponse({
    success: true,
    key
  }, 200);
}

async function handleGetImage(request, env) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace('/images/', ''));

  if (!key) {
    return new Response('Missing image key', { status: 400 });
  }

  const object = await env.IMAGES.get(key);

  if (!object) {
    return new Response('Image not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, {
    headers
  });
}

function getFileExtension(filename) {
  const parts = String(filename || '').split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : 'jpg';

  if (!ext) return 'jpg';
  return ext;
}
