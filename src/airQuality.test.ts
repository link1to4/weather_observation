import assert from 'node:assert/strict';
import test from 'node:test';
import { findNearestAirQualityStation, parseAirQualityRecords, getAqiLevel } from './airQuality';

test('MOENV numbers preserve zero and exclude missing or invalid observations', () => {
  const base = { siteid: '1', sitename: '臺北', latitude: '25.03', longitude: '121.51' };
  const stations = parseAirQualityRecords([
    { ...base, aqi: '0', 'pm2.5': '0', publishtime: '2026/11/07 10:00:00' },
    { ...base, aqi: '-99', 'pm2.5': 'ND' },
    { ...base, aqi: '', 'pm2.5': '   ' },
    { ...base, latitude: '' },
    { ...base, longitude: 'NaN' },
  ]);
  assert.equal(stations.length, 3);
  assert.equal(stations[0].aqi, 0);
  assert.equal(stations[0].pm25, 0);
  assert.equal(stations[0].publishTime, '2026/11/07 10:00:00');
  for (const station of stations.slice(1)) {
    assert.equal(station.aqi, null);
    assert.equal(station.pm25, null);
  }
});

test('nearest station uses geographic distance and handles an empty response', () => {
  const stations = parseAirQualityRecords([
    { siteid: 'south', latitude: '22.63', longitude: '120.30' },
    { siteid: 'north', latitude: '25.03', longitude: '121.51' },
  ]);
  const nearest = findNearestAirQualityStation(stations, 25.04, 121.51);
  assert.equal(nearest?.station.id, 'north');
  assert.ok(nearest.distanceKm > 1 && nearest.distanceKm < 1.2);
  assert.equal(findNearestAirQualityStation(stations, 22.63, 120.30)?.distanceKm, 0);
  assert.equal(findNearestAirQualityStation([], 25, 121), null);
});

test('AQI boundaries follow the six official status bands; missing values are separate', () => {
  const cases: [number, string][] = [
    [0, '良好'], [50, '良好'], [51, '普通'], [100, '普通'],
    [101, '對敏感族群不健康'], [150, '對敏感族群不健康'],
    [151, '對所有族群不健康'], [200, '對所有族群不健康'],
    [201, '非常不健康'], [300, '非常不健康'], [301, '危害'], [500, '危害'],
  ];
  for (const [value, label] of cases) assert.equal(getAqiLevel(value).label, label);
  for (const value of [null, NaN, -1]) assert.equal(getAqiLevel(value).label, '無資料');
});
