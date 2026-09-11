// Daily Orbit worker: runs the real sim core off the main thread. One instance per page.
importScripts('/solar-system/ss-core.js?v=20260911', 'orbit-engine.js?v=20260911');
const api = createSolarCore();
api.onEmit(function () {});
const eng = OrbitEngine(api);
onmessage = function (e) {
  const m = e.data;
  try {
    if (m.type === 'setup') postMessage({ id: m.id, type: 'board', board: eng.setup(m.day !== undefined ? m.day : eng.dayIndexFor(m.utcMs)) });
    else if (m.type === 'fly') postMessage({ id: m.id, type: 'flight', flight: eng.fly(m.day, m.speed, m.aim) });
  } catch (err) {
    postMessage({ id: m.id, type: 'error', message: String(err && err.message || err) });
  }
};
