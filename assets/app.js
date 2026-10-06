/* ===========================================================
   plane-vtp-target-field — page glue
   =========================================================== */

/* ---------- tabs ---------- */
const tabButtons = document.querySelectorAll("nav.tabs button");
const views = document.querySelectorAll(".view");
function showView(name) {
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  views.forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
}
tabButtons.forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
window.addEventListener("hashchange", () => {
  const h = location.hash.replace("#", "");
  if (h) showView(h);
});
if (location.hash) showView(location.hash.replace("#", ""));

/* ---------- simulation wiring ---------- */
const canvas = document.getElementById("simCanvas");
const sim = new VTPSim(canvas, PARAMS.N_DEFAULT);

const $ = (id) => document.getElementById(id);
const statusLine = $("statusLine");
const numAgents = $("numAgents");
const spfSlider = $("spfSlider"), spfVal = $("spfVal");
const viewSelect = $("viewSelect"), headingsCb = $("headingsCb");
const fsSlider = $("fsSlider"), fsVal = $("fsVal");
const faSlider = $("faSlider"), faVal = $("faVal");
const fieldVelInfo = $("fieldVelInfo");
const nuSlider = $("nuSlider"), nuVal = $("nuVal");
const spXSlider = $("spXSlider"), spXVal = $("spXVal");
const spYSlider = $("spYSlider"), spYVal = $("spYVal");
const halfSlider = $("halfSlider"), halfVal = $("halfVal");
const staticCount = $("staticCount");
const phaseSlider = $("phaseSlider"), phaseVal = $("phaseVal");
const cxSlider = $("cxSlider"), cxVal = $("cxVal");
const cySlider = $("cySlider"), cyVal = $("cyVal");
const btnPause = $("btnPause"), btnReset = $("btnReset"), btnRandom = $("btnRandom");

/* per-axis oscillation controls (x and y have the same three: frequency, amplitude, return-speed ratio) */
const AXES = ["x", "y"];
const axis = {};
AXES.forEach((a) => {
  const A = a.toUpperCase();
  axis[a] = {
    A,
    freqSlider: $("freqSlider_" + a), freqNum: $("freqNum_" + a),
    ampSlider: $("ampSlider_" + a), ampVal: $("ampVal_" + a),
    ratioSlider: $("ratioSlider_" + a), ratioVal: $("ratioVal_" + a),
    info: $("axisInfo_" + a),
  };
});

/* "period 100 steps: out 50, back 50" for one axis */
function axisInfoText(f, n) {
  if (!(f > 0)) return "frozen (frequency 0)";
  const p = n / (n + 1);
  const fmt = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));
  return `period ${fmt(1 / f)} steps: out ${fmt(p / f)}, back ${fmt((1 - p) / f)}`;
}
function showAxis(a) {
  const ax = axis[a];
  ax.info.textContent = axisInfoText(sim["oscFreq" + ax.A], sim["oscRatio" + ax.A]);
}
function setFreq(a, f) {
  const ax = axis[a];
  f = clamp(Number.isFinite(f) ? f : 0, 0, 1);
  sim["oscFreq" + ax.A] = f;             // phase accumulates, so changing f never makes the target jump
  ax.freqSlider.value = f;
  if (document.activeElement !== ax.freqNum) ax.freqNum.value = String(f);
  showAxis(a);
}
function setAmp(a, v) {
  const ax = axis[a];
  sim["oscAmp" + ax.A] = v; ax.ampSlider.value = v; ax.ampVal.textContent = v.toFixed(1);
}
function setRatio(a, v) {
  const ax = axis[a];
  sim["oscRatio" + ax.A] = v; ax.ratioSlider.value = v; ax.ratioVal.textContent = v.toFixed(2);
  showAxis(a);
}
function showStaticCount() {
  staticCount.textContent = `${sim.nStatic} static targets`;
}
function rebuildLattice() {
  sim.buildLattice();
  showStaticCount();
}

spfSlider.addEventListener("input", () => { sim.stepsPerFrame = +spfSlider.value; spfVal.textContent = spfSlider.value; });
viewSelect.addEventListener("change", () => { sim.viewMode = viewSelect.value; });
function showFieldVel() {
  const [vx, vy] = sim.fieldVel();
  fsVal.textContent = sim.fieldSpeed.toFixed(2);
  faVal.textContent = sim.fieldAngleDeg + "\u00b0";
  fieldVelInfo.textContent = `v = (${vx.toFixed(2)}, ${vy.toFixed(2)}) per step`;
}
fsSlider.addEventListener("input", () => { sim.fieldSpeed = +fsSlider.value; showFieldVel(); });
faSlider.addEventListener("input", () => { sim.fieldAngleDeg = +faSlider.value; showFieldVel(); });
headingsCb.addEventListener("change", () => { sim.showHeadings = headingsCb.checked; });
nuSlider.addEventListener("input", () => { sim.nu = +nuSlider.value; nuVal.textContent = sim.nu.toFixed(2); });

spXSlider.addEventListener("input", () => { sim.gridSpacingX = +spXSlider.value; spXVal.textContent = sim.gridSpacingX.toFixed(1); rebuildLattice(); });
spYSlider.addEventListener("input", () => { sim.gridSpacingY = +spYSlider.value; spYVal.textContent = sim.gridSpacingY.toFixed(1); rebuildLattice(); });
halfSlider.addEventListener("input", () => { sim.gridHalf = +halfSlider.value; halfVal.textContent = String(sim.gridHalf); rebuildLattice(); });

AXES.forEach((a) => {
  const ax = axis[a];
  ax.freqSlider.addEventListener("input", () => setFreq(a, +ax.freqSlider.value));
  ax.freqNum.addEventListener("input", () => { const v = parseFloat(ax.freqNum.value); if (!Number.isNaN(v)) setFreq(a, v); });
  ax.freqNum.addEventListener("change", () => { ax.freqNum.value = String(sim["oscFreq" + ax.A]); });
  ax.ampSlider.addEventListener("input", () => setAmp(a, +ax.ampSlider.value));
  ax.ratioSlider.addEventListener("input", () => setRatio(a, +ax.ratioSlider.value));
});
phaseSlider.addEventListener("input", () => { sim.oscPhaseYDeg = +phaseSlider.value; phaseVal.textContent = sim.oscPhaseYDeg + "\u00b0"; });
cxSlider.addEventListener("input", () => { sim.oscCx = +cxSlider.value; cxVal.textContent = sim.oscCx.toFixed(1); });
cySlider.addEventListener("input", () => { sim.oscCy = +cySlider.value; cyVal.textContent = sim.oscCy.toFixed(1); });

btnPause.addEventListener("click", () => {
  sim.paused = !sim.paused;
  btnPause.textContent = sim.paused ? "Resume" : "Pause";
});

function restoreDefaults() {
  sim.nu = PARAMS.NU_DEFAULT; nuSlider.value = sim.nu; nuVal.textContent = sim.nu.toFixed(2);
  sim.gridSpacingX = PARAMS.GRID_SPACING_X; spXSlider.value = sim.gridSpacingX; spXVal.textContent = sim.gridSpacingX.toFixed(1);
  sim.gridSpacingY = PARAMS.GRID_SPACING_Y; spYSlider.value = sim.gridSpacingY; spYVal.textContent = sim.gridSpacingY.toFixed(1);
  sim.gridHalf = PARAMS.GRID_HALF; halfSlider.value = sim.gridHalf; halfVal.textContent = String(sim.gridHalf);
  setFreq("x", PARAMS.OSC_FREQ_X); setFreq("y", PARAMS.OSC_FREQ_Y);
  setAmp("x", PARAMS.OSC_AMP_X); setAmp("y", PARAMS.OSC_AMP_Y);
  setRatio("x", PARAMS.OSC_RATIO_X); setRatio("y", PARAMS.OSC_RATIO_Y);
  sim.oscPhaseYDeg = PARAMS.OSC_PHASE_Y_DEG; phaseSlider.value = sim.oscPhaseYDeg; phaseVal.textContent = sim.oscPhaseYDeg + "\u00b0";
  sim.oscCx = PARAMS.OSC_CX; cxSlider.value = sim.oscCx; cxVal.textContent = sim.oscCx.toFixed(1);
  sim.oscCy = PARAMS.OSC_CY; cySlider.value = sim.oscCy; cyVal.textContent = sim.oscCy.toFixed(1);
  sim.fieldSpeed = PARAMS.FIELD_SPEED; fsSlider.value = sim.fieldSpeed;
  sim.fieldAngleDeg = PARAMS.FIELD_ANGLE_DEG; faSlider.value = sim.fieldAngleDeg;
  showFieldVel();
  rebuildLattice();
}
btnReset.addEventListener("click", () => {
  restoreDefaults();
  sim.setup(+numAgents.value, true);
});
btnRandom.addEventListener("click", () => sim.setup(+numAgents.value, false));
numAgents.addEventListener("change", () => sim.setup(+numAgents.value, true));

showAxis("x"); showAxis("y"); showFieldVel();
showStaticCount();

/* ---------- animation loop ---------- */
function loop() {
  if (!sim.paused) for (let k = 0; k < sim.stepsPerFrame; k++) sim.step();
  sim.draw();
  statusLine.textContent =
    `t = ${sim.t} | N = ${sim.N} | ${sim.nStatic} static + 1 oscillating target | ` +
    `f = (${sim.oscFreqX.toFixed(4)}, ${sim.oscFreqY.toFixed(4)}) cycles/step | ` +
    `n = (${sim.oscRatioX.toFixed(2)}, ${sim.oscRatioY.toFixed(2)}) | field v = ${sim.fieldSpeed.toFixed(2)} | \u03bd = ${sim.nu.toFixed(2)}`;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- matlab file viewer ---------- */
const FILE_NOTES = {
  "dynamics.m": "Main script. Target-field settings (lattice spacing in x and y, field translation speed, x/y oscillation frequencies, amplitudes, asymmetry) are at the top, and the oscWave function is at the bottom; then the VTP loop: Delaunay neighbors, repulsion + alignment + homing, Voronoi speed governor.",
  "Target.m": "Target class: target geometry and the homeToTarget homing-vector method. The lattice and the oscillating target are point components of one Target object.",
  "nearestOnSegment.m": "Geometry helper used internally by Target.m for segment-shaped targets.",
  "neighborhoods.m": "Delaunay-graph neighbors of every agent, plus each agent's nearest neighbor and its distance.",
  "transition.m": "Smooth cutoff functions (the model uses 'expReciprocal'): 1 at 0, exactly 0 from 1 onward.",
  "alignTo.m": "Alignment term: Delaunay neighbors' headings weighted by how well they agree with the agent's own.",
  "voronoiProjectToBoundary.m": "Distance from each agent to its Voronoi cell boundary along its direction of motion (the speed governor).",
  "voronoiForwardArea.m": "Forward Voronoi area, used only when fdim = 2 in dynamics.m.",
  "poly_area.m": "Polygon area helper used by voronoiForwardArea.m.",
};
const FILE_ORDER = ["dynamics.m", "Target.m", "nearestOnSegment.m", "neighborhoods.m", "transition.m", "alignTo.m", "voronoiProjectToBoundary.m", "voronoiForwardArea.m", "poly_area.m"];

const fileList = $("fileList");
const codeView = $("codeView");
const fileHint = $("fileHint");
let MATLAB_SRC = null;

async function loadMatlabSource() {
  try {
    const res = await fetch("assets/matlab_src.json");
    MATLAB_SRC = await res.json();
  } catch (e) {
    MATLAB_SRC = null;
    codeView.textContent = "Could not load assets/matlab_src.json (serve the folder over http, e.g. python3 -m http.server).";
    return;
  }
  let first = true;
  FILE_ORDER.forEach((name) => {
    if (!(name in MATLAB_SRC)) return;
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.addEventListener("click", () => selectFile(name));
    fileList.appendChild(btn);
    if (first) { selectFile(name); first = false; }
  });
}
function selectFile(name) {
  [...fileList.children].forEach((b) => b.classList.toggle("active", b.textContent === name));
  codeView.textContent = MATLAB_SRC[name];
  fileHint.textContent = FILE_NOTES[name] || "";
}
loadMatlabSource();
