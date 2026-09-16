import assert from 'assert';
import { LocationService } from '../src/services/locationService';

export async function runLocationServiceTests() {
  console.log('\n--- Running LocationService Tests ---');

  const loc = await LocationService.getCurrentLocation();

  assert.ok(loc.latitude !== 0, 'Latitude must never silently return 0');
  assert.ok(loc.longitude !== 0, 'Longitude must never silently return 0');
  assert.ok(loc.latitude >= -90 && loc.latitude <= 90, 'Latitude must be valid WGS84');
  assert.ok(loc.longitude >= -180 && loc.longitude <= 180, 'Longitude must be valid WGS84');
  assert.ok(loc.timestamp, 'Timestamp must be present');
  assert.ok(!isNaN(new Date(loc.timestamp).getTime()), 'Timestamp must be valid ISO date string');
  assert.ok(loc.areaDetails, 'Area details must be resolved');
  assert.ok(loc.areaDetails.areaName, 'Area name must be present');
  assert.ok(loc.areaDetails.district, 'District must be present');
  assert.ok(loc.areaDetails.geologicalGrid, 'Geological grid must be present');

  console.log(`✓ GPS location acquired: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)} (Accuracy: ${loc.accuracy_m}m)`);
  console.log(`✓ Resolved Area: "${loc.areaDetails.areaName}" in ${loc.areaDetails.district}, ${loc.areaDetails.state}`);
  console.log(`✓ Sector Telemetry: Grid ${loc.areaDetails.geologicalGrid}, Elevation ~${loc.areaDetails.elevationM}m MSL`);
  console.log('✓ Zero-coordinate guard verified (0,0 is never silently submitted)');
}
