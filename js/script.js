const $ = (id) => document.getElementById(id);

// ----------------------------- Mode Selection Handling -----------------------------
const modeSelection = $('modeSelection');
const mainContainer = $('mainContainer');
const modeButtons = document.querySelectorAll('.modeBtn');
const backToModeSelectionBtn = $('backToModeSelection');

const visualSection = $('visualSection');
const codeSection = $('codeSection');

// Timer variables
let visTimer = null;
let codeTimer = null;

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    modeSelection.style.display = 'none';
    mainContainer.style.display = 'flex';

    if (mode === 'visualization') {
      visualSection.style.display = "flex";
      codeSection.style.display = "none";
    } else {
      visualSection.style.display = "none";
      codeSection.style.display = "flex";
    }

    // Draw initially
    randomGraph()
  });
});



backToModeSelectionBtn.addEventListener('click', () => {
  mainContainer.style.display = 'none';
  modeSelection.style.display = 'flex';

  const visPlayPause = $('visPlayPause');
  const visNext = $('visNext');
  
  if (visPlayPause) visPlayPause.hidden = false;
  if (visNext) visNext.hidden = false;

  // Reset any running animations
  if (visTimer) {
    clearInterval(visTimer);
    visTimer = null;
  }
  if (codeTimer) {
    clearInterval(codeTimer);
    codeTimer = null;
  }
  
  // Reset play button text
  const playBtn = $('playBtn');
  if (playBtn) playBtn.textContent = 'Play';
});

// ----------------------------- Graph Visualization -----------------------------
const svg = $("graphSvg");

let nodes = [];
let edges = [];
let currentEdgeIndex = 0;
let isPlaying = false;

/* ================= SVG SETUP ================= */

function setupSvgDefs() {
  svg.innerHTML = "";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "arrow");
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "7");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("orient", "auto");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 0 L 10 5 L 0 10 Z");
  path.setAttribute("fill", "#333");

  marker.appendChild(path);
  defs.appendChild(marker);
  svg.appendChild(defs);
}



/* ================= GRAPH CREATION ================= */

function createNodes(n) {
  nodes = [];

  const { width, height } = svg.getBoundingClientRect();
  const cx = width / 2;
  const cy = height / 2;

  const margin = 60;
  const r = Math.min(cx, cy) - margin;

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    nodes.push({
      id: i,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
}


function randomGraph() {
  setupSvgDefs();
  edges = [];
  const edgeSet = new Set();

  const n = Number($("vertexCount")?.value || 5);
  createNodes(n);

  const connected = Array(n).fill(false);

  // Ensure DAG backbone
  for (let u = 0; u < n - 1; u++) {
    const v = u + 1 + Math.floor(Math.random() * (n - u - 1));
    const key = `${u}-${v}`;
    edgeSet.add(key);

    edges.push({
      u,
      v,
      w: Math.random() < 0.25 ? -3 : Math.floor(Math.random() * 6) + 1
    });

    connected[u] = connected[v] = true;
  }

  // Extra DAG edges (no duplicates)
  const extraEdges = n;
  for (let i = 0; i < extraEdges; i++) {
    const u = Math.floor(Math.random() * (n - 1));
    const v = u + 1 + Math.floor(Math.random() * (n - u - 1));
    const key = `${u}-${v}`;

    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({
        u,
        v,
        w: Math.floor(Math.random() * 6) + 1
      });
      connected[u] = connected[v] = true;
    }
  }

  drawGraph();
}



/* ================= DRAW ================= */

function drawGraph(activeEdge = null) {
  
  svg.innerHTML = ""
  setupSvgDefs();
  

  edges.forEach((e, i) => {
  const x1 = nodes[e.u].x;
  const y1 = nodes[e.u].y;
  const x2 = nodes[e.v].x;
  const y2 = nodes[e.v].y;

  // Direction vector
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);

  // Normalize
  const ux = dx / len;
  const uy = dy / len;

  // Offset so arrow does NOT touch node
  const nodeRadius = 18;
  const startX = x1 + ux * nodeRadius;
  const startY = y1 + uy * nodeRadius;
  const endX = x2 - ux * nodeRadius;
  const endY = y2 - uy * nodeRadius;

  // Draw edge
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", startX);
  line.setAttribute("y1", startY);
  line.setAttribute("x2", endX);
  line.setAttribute("y2", endY);
  line.setAttribute("marker-end", "url(#arrow)");
  line.setAttribute(
    "class",
    `edge ${e.w < 0 ? "negative" : ""} ${activeEdge === i ? "active" : ""}`
  );
  svg.appendChild(line);

  // ---- WEIGHT POSITION (PERPENDICULAR OFFSET) ----
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Perpendicular vector
  const offset = 14;
  const px = -uy * offset;
  const py = ux * offset;

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", midX + px);
  label.setAttribute("y", midY + py);
  label.setAttribute("class", "edge-weight");
  label.textContent = e.w;

  svg.appendChild(label);
});


  drawNodes();
}



function drawNodes() {
  nodes.forEach(n => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", n.x);
    c.setAttribute("cy", n.y);
    c.setAttribute("r", 18);
    c.setAttribute("class", "node");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", n.x);
    text.setAttribute("y", n.y + 5);
    text.setAttribute("class", "node-text");
    text.textContent = n.id;

    g.appendChild(c);
    g.appendChild(text);
    svg.appendChild(g);
  });
}


/* ================= BUTTON WIRES ================= */

const randomGraphBtn = $("randomGraphBtn");
if (randomGraphBtn) {
  randomGraphBtn.onclick = randomGraph;
}

const vertexInput = $("vertexCount");

vertexInput.addEventListener("change", () => {
  const value = Number(vertexInput.value);

  if (value < 3 || value > 7) {
    window.alert("Number of vertices must be between 3 and 7.");
    vertexInput.value = 5; // optional: reset to default
    randomGraph();
    return;
  }

  randomGraph();
});

const playBtn = $("playBtn");
if (playBtn) {
  playBtn.onclick = () => {
    if (isPlaying) {
      // Pause
      if (visTimer) {
        clearInterval(visTimer);
        visTimer = null;
      }
      isPlaying = false;
      playBtn.textContent = 'Play';
    } else {
      // Play
      const speedSelect = $("speedSelect");
      const speed = speedSelect ? Number(speedSelect.value) : 500;
      
      visTimer = setInterval(() => {
        drawGraph(currentEdgeIndex % edges.length);
        currentEdgeIndex++;
      }, speed);
      
      isPlaying = true;
      playBtn.textContent = 'Pause';
    }
  };
}

const pauseBtn = $("pauseBtn");
if (pauseBtn) {
  pauseBtn.onclick = () => {
    if (visTimer) {
      clearInterval(visTimer);
      visTimer = null;
    }
    isPlaying = false;
    if (playBtn) playBtn.textContent = 'Play';
  };
}

const nextBtn = $("nextBtn");
if (nextBtn) {
  nextBtn.onclick = () => {
    if (edges.length > 0) {
      currentEdgeIndex = (currentEdgeIndex + 1) % edges.length;
      drawGraph(currentEdgeIndex);
    }
  };
}

const handleVisReset = () => {
  
  edges = [];
  nodes = [];

  svg.innerHTML = "";     // clear visualization
  randomGraph();          // regenerate graph
};


const resetBtn = $('resetBtn')
if (resetBtn){
  resetBtn.onclick = handleVisReset
}


// ---------------- MANUAL GRAPH BUILDER ----------------

document.addEventListener("DOMContentLoaded", () => {

const manual = {
  nodes: [],
  edges: [],
  selectedNode: null,
  edgeSet: new Set()
};

const manualSvg = document.getElementById("manual-svg");
const NODE_R = 18;
const TEXT_OFFSET = 12;
let pendingEdge = null;

/* ================= OPEN / CLOSE ================= */

document.getElementById("build-manually").onclick = openManualEditor;
document.querySelectorAll(".close-manual").forEach(b => b.onclick = closeManualEditor);
document.getElementById("edge-cancel").onclick = closeEdgeModal;
document.getElementById("apply-manual").onclick = validateAndApply;

/* ================= MODAL ================= */

function openManualEditor() {
  document.getElementById("manual-modal").classList.remove("hidden");
  resetManual();
  setupDefs();
  createNodesModal();
  draw();
}

function closeManualEditor() {
  document.getElementById("manual-modal").classList.add("hidden");
}

/* ================= RESET ================= */

function resetManual() {
  manual.nodes = [];
  manual.edges = [];
  manual.edgeSet.clear();
  manual.selectedNode = null;
  manualSvg.innerHTML = "";
}

/* ================= SVG DEFS ================= */

function setupDefs() {
  const defs = svg("defs");

  const marker = svg("marker", {
    id: "arrow-manual",
    viewBox: "0 0 10 10",
    refX: "9",
    refY: "5",
    markerWidth: "6",
    markerHeight: "6",
    orient: "auto"
  });

  marker.appendChild(svg("path", {
    d: "M 0 0 L 10 5 L 0 10 Z",
    fill: "#374151"
  }));

  defs.appendChild(marker);
  manualSvg.appendChild(defs);
}

/* ================= NODES ================= */

function createNodesModal() {
  const n = Number(document.getElementById("vertexCount").value);
  const { width, height } = manualSvg.getBoundingClientRect();
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) - 60;


  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    manual.nodes.push({
      id: i,
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a)
    });
  }
}

/* ================= DRAW ================= */

function draw() {
  manualSvg.innerHTML = manualSvg.innerHTML.split("</defs>")[0] + "</defs>";
  manual.edges.forEach(drawEdge);
  manual.nodes.forEach(drawNode);
}

/* ================= EDGE ================= */

function drawEdge(e) {
  const dx = e.x2 - e.x1;
  const dy = e.y2 - e.y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;

  const x1 = e.x1 + ux * NODE_R;
  const y1 = e.y1 + uy * NODE_R;
  const x2 = e.x2 - ux * NODE_R;
  const y2 = e.y2 - uy * NODE_R;

  const line = svg("line", {
    x1, y1, x2, y2,
    class: "manual-edge",
    "marker-end": "url(#arrow-manual)"
  });

  line.onclick = () => removeEdge(e);
  manualSvg.appendChild(line);

  // perpendicular offset for text
  const px = -uy;
  const py = ux;

  const tx = (x1 + x2) / 2 + px * TEXT_OFFSET;
  const ty = (y1 + y2) / 2 + py * TEXT_OFFSET;

  const bg = svg("rect", {
    x: tx - 10,
    y: ty - 10,
    rx: 6,
    ry: 6,
    width: 20,
    height: 18,
    class: "edge-weight-bg"
  });

  const text = svg("text", {
    x: tx,
    y: ty + 5,
    class: "edge-weight"
  });
  text.textContent = e.w;

  manualSvg.appendChild(bg);
  manualSvg.appendChild(text);
}

/* ================= NODE ================= */

function drawNode(n) {
  const g = svg("g");

  const c = svg("circle", {
    cx: n.x,
    cy: n.y,
    r: NODE_R,
    class: `manual-node ${manual.selectedNode === n ? "selected" : ""}`
  });

  const t = svg("text", {
    x: n.x,
    y: n.y + 5,
    class: "node-label"
  });
  t.textContent = n.id;

  c.onclick = () => onNodeClick(n);

  g.appendChild(c);
  g.appendChild(t);
  manualSvg.appendChild(g);
}

/* ================= INTERACTION ================= */

function onNodeClick(node) {
  if (!manual.selectedNode) {
    manual.selectedNode = node;
    draw();
    return;
  }

  if (manual.selectedNode === node) {
    manual.selectedNode = null;
    draw();
    return;
  }

  pendingEdge = { from: manual.selectedNode, to: node };
  openEdgeModal();
  manual.selectedNode = null;
}

/* ================= EDGE MODAL ================= */

function openEdgeModal() {
  document.getElementById("edge-info").textContent =
    `From ${pendingEdge.from.id} → ${pendingEdge.to.id}`;
  document.getElementById("edge-modal").classList.remove("hidden");
}

function closeEdgeModal() {
  document.getElementById("edge-modal").classList.add("hidden");
}

document.getElementById("edge-confirm").onclick = () => {
  const w = Number(document.getElementById("edge-weight").value);
  if (isNaN(w)) return;

  const key = `${pendingEdge.from.id}->${pendingEdge.to.id}`;
  if (manual.edgeSet.has(key)) {
    alert("Duplicate edge not allowed");
    return;
  }

  manual.edgeSet.add(key);
  manual.edges.push({
    u: pendingEdge.from.id,
    v: pendingEdge.to.id,
    x1: pendingEdge.from.x,
    y1: pendingEdge.from.y,
    x2: pendingEdge.to.x,
    y2: pendingEdge.to.y,
    w
  });

  closeEdgeModal();
  draw();
};

/* ================= REMOVE EDGE ================= */

function removeEdge(edge) {
  manual.edges = manual.edges.filter(e => e !== edge);
  manual.edgeSet.delete(`${edge.u}->${edge.v}`);
  draw();
}

/* ================= DAG VALIDATION ================= */

function validateAndApply() {
  const n = manual.nodes.length;
  const adj = Array.from({ length: n }, () => []);
  const indeg = Array(n).fill(0);

  for (const e of manual.edges) {
    if (e.u === e.v) {
      showError(`Self loop detected at node ${e.u}`);
      return;
    }
    adj[e.u].push(e.v);
    indeg[e.v]++;
  }

  // Kahn’s algorithm
  const q = [];
  indeg.forEach((d, i) => d === 0 && q.push(i));

  let visited = 0;
  while (q.length) {
    const u = q.shift();
    visited++;
    for (const v of adj[u]) {
      if (--indeg[v] === 0) q.push(v);
    }
  }

  if (visited !== n) {
    showError(
      "Cycle detected.\nFix by removing at least one edge from the cycle."
    );
    return;
  }

  // showSuccess("Valid DAG Graph applied successfully");
  var manualEdges = manual.edges.map(e => ({
  u: e.u,
  v: e.v,
  w: e.w
}));

  edges = manualEdges
  

  drawGraph()
  closeManualEditor()
}

/* ================= UI HELPERS ================= */

function showError(msg) {
  alert("❌ " + msg);
}

function showSuccess(msg) {
  alert(msg);
}

function svg(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

});
