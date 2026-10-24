// State-capital coordinates provide a coarse regional sample, not a field-level map.
const STATE_POINTS = {
  "Andhra Pradesh": [16.5062, 80.648], "Arunachal Pradesh": [27.0844, 93.6053],
  Assam: [26.1445, 91.7362], Bihar: [25.5941, 85.1376], Chhattisgarh: [21.2514, 81.6296],
  Goa: [15.4909, 73.8278], Gujarat: [23.0225, 72.5714], Haryana: [30.7333, 76.7794],
  "Himachal Pradesh": [31.1048, 77.1734], Jharkhand: [23.3441, 85.3096], Karnataka: [15.3173, 75.7139],
  Kerala: [8.5241, 76.9366], "Madhya Pradesh": [23.2599, 77.4126], Maharashtra: [19.076, 72.8777],
  Manipur: [24.817, 93.9368], Meghalaya: [25.5788, 91.8933], Mizoram: [23.7271, 92.7176],
  Nagaland: [25.6751, 94.1086], Odisha: [20.2961, 85.8245], Punjab: [30.7333, 76.7794],
  Rajasthan: [26.9124, 75.7873], Sikkim: [27.3389, 88.6065], "Tamil Nadu": [13.0827, 80.2707],
  Telangana: [17.385, 78.4867], Tripura: [23.8315, 91.2868], "Uttar Pradesh": [26.8467, 80.9462],
  Uttarakhand: [30.3165, 78.0322], "West Bengal": [22.5726, 88.3639],
};

function textureClass(clay, sand) {
  if (clay >= 40) return "Clay";
  if (clay >= 27) return sand >= 45 ? "Clay loam" : "Clay loam / silty clay loam";
  if (clay >= 20) return sand >= 52 ? "Sandy clay loam" : "Loam / silt loam";
  if (sand >= 85) return "Sand";
  if (sand >= 70) return "Loamy sand";
  if (sand >= 43) return "Sandy loam";
  if (clay >= 7) return "Loam";
  return "Silt loam";
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const value = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

async function fetchSoilAt(lat, lon) {
  const url = new URL("https://rest.isric.org/soilgrids/v2.0/properties/query");
  const params = new URLSearchParams({ lon: String(lon), lat: String(lat), depth: "0-5cm", value: "mean" });
  params.append("property", "clay");
  params.append("property", "sand");
  url.search = params.toString();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.status === 429 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        continue;
      }
      if (!response.ok) return null;
      const data = await response.json();
      const layers = data?.properties?.layers || [];
      const meanValue = (name) => {
        const layer = layers.find((item) => item.name === name);
        const depth = layer?.depths?.find((item) => item.label === "0-5cm") || layer?.depths?.[0];
        const value = depth?.values?.mean;
        return Number.isFinite(value) ? value : null;
      };
      const clayRaw = meanValue("clay");
      const sandRaw = meanValue("sand");
      if (clayRaw == null || sandRaw == null) return null;
      return { clayRaw, sandRaw, lat, lon };
    } catch {
      return null;
    }
  }
  return null;
}

export async function lookupStateSoil(state) {
  const point = STATE_POINTS[state];
  if (!point) return { ok: false, error: "Choose a valid Indian state." };
  const [lat, lon] = point;
  try {
    let sample = await fetchSoilAt(lat, lon);
    if (!sample) {
      // Capital locations can fall on built-up or unmapped pixels. Search nearby
      // grid points in small batches, stopping at the first available soil value.
      const offsets = [
        [0, 0.2], [0.2, 0], [0, -0.2], [-0.2, 0],
        [0.2, 0.2], [0.2, -0.2], [-0.2, 0.2], [-0.2, -0.2],
        [0, 0.45], [0.45, 0], [0, -0.45], [-0.45, 0],
      ];
      for (let i = 0; i < offsets.length && !sample; i += 4) {
        const batch = offsets.slice(i, i + 4);
        const candidates = await Promise.all(batch.map(([dLat, dLon]) => fetchSoilAt(lat + dLat, lon + dLon)));
        sample = candidates.find(Boolean) || null;
      }
    }
    if (!sample) throw new Error("No mapped soil pixels near the state reference point.");
    const clayPercent = Math.round(sample.clayRaw / 10);
    const sandPercent = Math.round(sample.sandRaw / 10);
    const sampleDistanceKm = distanceKm(lat, lon, sample.lat, sample.lon);
    return {
      ok: true,
      texture: textureClass(clayPercent, sandPercent),
      clayPercent,
      sandPercent,
      depth: "0–5 cm",
      estimate: sampleDistanceKm
        ? `Nearest mapped SoilGrids sample about ${sampleDistanceKm} km from the state reference point; soils vary within the state.`
        : "SoilGrids sample at the state reference point; soils vary within the state.",
      source: "ISRIC SoilGrids",
      sourceUrl: "https://soilgrids.org/",
    };
  } catch (error) {
    console.warn("Soil lookup failed", error.message);
    return { ok: false, error: "Soil data is temporarily unavailable. The label-based report is still available." };
  }
}
