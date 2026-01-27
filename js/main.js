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
let algorithmStartTime = null;
let executionTime = 0;


// Bellman-Ford Globals
let nodes = [];
let edges = [];
let sourceNode = 0;
let distances = [];
let predecessors = []; // Add global predecessors
let nodeStates = {};
let isPlaying = false;
let algorithmSteps = []; // Track algorithm steps


// Code walkthrough snippet and highlighting map
const codeSnippet = [
  { line: 1, text: "const dist = Array(V).fill(Infinity);" },
  { line: 2, text: "dist[source] = 0;" },
  { line: 3, text: "for (let i = 0; i < V - 1; i++) {" },
  { line: 4, text: "  for (const { u, v, w } of edges) {" },
  { line: 5, text: "    if (dist[u] !== Infinity && dist[u] + w < dist[v]) {" },
  { line: 6, text: "      dist[v] = dist[u] + w;" },
  { line: 7, text: "      prev[v] = u;" },
  { line: 8, text: "    }" },
  { line: 9, text: "  }" },
  { line: 10, text: "}" }
];


const codeLineMap = {
  init: [2],
  "iteration-start": [3],
  check: [5],
  relax: [6],
  "set-prev": [7],
  "no-relax": [5],
  "early-stop": [3],
  complete: [10]
};


function renderCodeSnippet() {
  const container = $("codeLines");
  if (!container) return;


  container.innerHTML = codeSnippet
    .map(({ line, text }) => `
      <div class="code-line" data-line="${line}">
        <span class="line-number">${line}</span>
        <span class="code-text">${text}</span>
      </div>
    `)
    .join("");
}


function highlightCodeLines(lineNumbers = []) {
  const container = $("codeLines");
  if (!container) return;


  const lines = container.querySelectorAll(".code-line");
  lines.forEach(line => line.classList.remove("active"));


  let target = null;
  lineNumbers.forEach(num => {
    const el = container.querySelector(`[data-line="${num}"]`);
    if (el) {
      el.classList.add("active");
      target = el;
    }
  });


  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}


function highlightCodeForStep(stepType) {
  const lines = codeLineMap[stepType] || [];
  highlightCodeLines(lines);
}


renderCodeSnippet();


modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    modeSelection.style.display = 'none';
    mainContainer.style.display = 'flex';


    const analysisSection = document.getElementById('analysisSection');


    if (mode === 'visualization') {
      visualSection.style.display = "flex";
      codeSection.classList.remove("active");
      codeSection.style.display = "none";
      const visDist = document.getElementById('distanceSectionVis');
      if (visDist) visDist.style.display = 'block';
      if (analysisSection) analysisSection.style.display = 'none';
    } else {
      visualSection.style.display = "flex";
      codeSection.style.display = "block";
      codeSection.classList.add("active");
      const visDist = document.getElementById('distanceSectionVis');
      if (visDist) visDist.style.display = 'none';
      if (analysisSection) analysisSection.style.display = 'block';
    }


    // Draw initially
    randomGraph();
  });
});




backToModeSelectionBtn.addEventListener('click', () => {
  mainContainer.style.display = 'none';
  modeSelection.style.display = 'flex';
  codeSection.classList.remove("active");
  codeSection.style.display = "none";


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
  const playBtn = $('playPauseBtn');
  if (playBtn) playBtn.textContent = 'Play';


  resetAlgorithm();
});


// ----------------------------- Graph Visualization -----------------------------
const svg = $("graphSvg");


// let nodes = []; // Moved to Bellman-Ford Globals
// let edges = []; // Moved to Bellman-Ford Globals
let currentEdgeIndex = 0;
// let isPlaying = false; // Moved to Bellman-Ford Globals


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


/* ================= SOURCE NODE SELECTOR ================= */


function updateSourceNodeSelector() {
  const sourceInput = $("sourceVertex");
  if (!sourceInput) return;
  sourceInput.value = sourceNode;
  sourceInput.max = nodes.length - 1;
}


// Event listener for Source Vertex Input
const sourceInput = $("sourceVertex");
if (sourceInput) {
  sourceInput.addEventListener("change", () => {
    let val = parseInt(sourceInput.value);
    if (isNaN(val)) val = 0;


    if (val < 0) val = 0;
    if (val >= nodes.length) val = nodes.length - 1;


    sourceInput.value = val;
    sourceNode = val;


    // Reset and redraw
    resetAlgorithm();
    initializeDistances();
    drawGraph();
  });
}


/* ================= DISTANCE TABLE ================= */


function initializeDistances() {
  distances = [];
  nodeStates = {};
  predecessors = Array(nodes.length).fill("-"); // Track Prev


  nodes.forEach(n => {
    distances[n.id] = n.id === sourceNode ? 0 : Infinity;
    nodeStates[n.id] = n.id === sourceNode ? 'source' : 'default';
  });


  renderDistanceTable();
}


function renderDistanceTable(updatedNode = null) {
  const containers = [
    $("distanceTable"),     // Code walkthrough panel
    $("distanceTableVis")   // Visualization left panel
  ].filter(Boolean);


  if (containers.length === 0) return;


  containers.forEach(tableDiv => {
    tableDiv.innerHTML = "";


    // Header
    const header = document.createElement("div");
    header.className = "dist-header";
    header.innerHTML = `<span>Node</span><span>Dist</span><span>Prev</span>`;
    tableDiv.appendChild(header);


    nodes.forEach(n => {
      const row = document.createElement("div");
      row.className = "dist-row";


      if (n.id === sourceNode) row.classList.add("source-row");
      if (updatedNode === n.id) row.classList.add("updated-row");


      // Col 1: Node
      const colNode = document.createElement("span");
      colNode.textContent = n.id;


      // Col 2: Dist
      const colDist = document.createElement("span");
      const d = distances[n.id];
      colDist.textContent = d === Infinity ? "∞" : d;


      // Col 3: Prev
      const colPrev = document.createElement("span");
      colPrev.textContent = predecessors[n.id] !== undefined ? predecessors[n.id] : "-";


      row.appendChild(colNode);
      row.appendChild(colDist);
      row.appendChild(colPrev);
      tableDiv.appendChild(row);
    });
  });
}


function setStatusMessage(message, type = "info") {
  const statusDiv = $("statusMessage");
  if (!statusDiv) return;


  statusDiv.textContent = message;
  statusDiv.className = type;
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


  // Reset algorithm state
  resetAlgorithm();


  // Initialize distances
  initializeDistances();
  updateSourceNodeSelector(); // Keep this but update the function to work with input



  // Initialize distances
  initializeDistances();


  // Calc Complexity O(VE)
  const complexity = n * edges.length;
  const complexityEl = document.getElementById("complexityValue");
  if (complexityEl) complexityEl.textContent = `O(${complexity})`;


  drawGraph();
  setStatusMessage("Graph generated. Press Play to run Bellman-Ford algorithm.", "info");
}




/* ================= DRAW ================= */


function drawGraph(activeEdge = null) {


  svg.innerHTML = "";
  setupSvgDefs();

  edges.forEach((e, i) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "edge-group");


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


    // Base edge line
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
    group.appendChild(line);


    // Hit zone for easier hovering/clicking
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hit.setAttribute("x1", startX);
    hit.setAttribute("y1", startY);
    hit.setAttribute("x2", endX);
    hit.setAttribute("y2", endY);
    hit.setAttribute("class", "edge-hit");
    group.appendChild(hit);


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
    label.setAttribute("class", "edge-weight editable");
    label.textContent = e.w;
    group.appendChild(label);


    svg.appendChild(group);
  });



  drawNodes();
}


function graphChanged(message) {
  resetAlgorithm();
  initializeDistances();
  drawGraph();
  setStatusMessage(`${message} Press Play to run Bellman-Ford algorithm.`, "info");
}


function removeEdgeByIndex(index) {
  if (index < 0 || index >= edges.length) return;
  edges.splice(index, 1);
  graphChanged("Edge removed.");
}


function editEdgeWeight(index) {
  const edge = edges[index];
  if (!edge) return;


  const input = window.prompt("Enter new weight for this edge", edge.w);
  if (input === null) return;


  const newWeight = Number(input);
  if (Number.isNaN(newWeight)) {
    window.alert("Please enter a valid number.");
    return;
  }


  edges[index].w = newWeight;
  graphChanged("Edge weight updated.");
}




function drawNodes() {
  nodes.forEach(n => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");


    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", n.x);
    c.setAttribute("cy", n.y);
    c.setAttribute("r", 18);


    // Apply node state class
    let nodeClass = "node";
    if (nodeStates[n.id]) {
      nodeClass += " " + nodeStates[n.id];
    }
    c.setAttribute("class", nodeClass);


    // Node ID
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", n.x);
    text.setAttribute("y", n.y + 5);
    text.setAttribute("class", "node-text");
    text.textContent = n.id;


    // Distance Label (new)
    const distText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    distText.setAttribute("x", n.x);
    distText.setAttribute("y", n.y - 25);
    distText.setAttribute("class", "node-dist");
    distText.setAttribute("text-anchor", "middle");
    distText.setAttribute("fill", "#000");
    distText.setAttribute("font-size", "12px");
    distText.setAttribute("font-weight", "bold");


    const d = distances[n.id];
    distText.textContent = d === Infinity ? "∞" : d;


    g.appendChild(c);
    g.appendChild(text);
    g.appendChild(distText);
    svg.appendChild(g);
  });
}



/* ================= BELLMAN-FORD ALGORITHM ================= */


function generateBellmanFordSteps() {
  algorithmSteps = [];
  algorithmStartTime = performance.now();
  const n = nodes.length;
  const V = n; // Number of vertices
  const E = edges.length; // Number of edges
  const dist = [];
  const currentPredecessors = Array(n).fill("-"); // Local predecessors for step generation


  // Initialize distances
  nodes.forEach(node => {
    dist[node.id] = node.id === sourceNode ? 0 : Infinity;
    if (node.id === sourceNode) {
      currentPredecessors[node.id] = "-"; // Source has no predecessor
    }
  });


  // Add initial step
  algorithmSteps.push({
    type: 'init',
    message: `Initialize: Source node ${sourceNode} = 0, all others = ∞`,
    distances: [...dist],
    predecessors: [...currentPredecessors],
    activeEdge: null,
    activeNodes: [sourceNode],
    updatedNode: null
  });


  let relaxCount = 0; // Track relaxations


  // Run Bellman-Ford
  for (let i = 0; i < V - 1; i++) {
    let relaxedInThisIteration = false;


    // Step: Start Iteration
    algorithmSteps.push({
      type: 'iteration-start',
      message: `Iteration ${i + 1} of ${V - 1}: Relaxing all edges...`,
      distances: [...dist],
      predecessors: [...currentPredecessors],
      activeEdge: null,
      activeNodes: [],
      updatedNode: null,
      relaxCount: relaxCount // Pass current count
    });


    for (let j = 0; j < E; j++) {
      const edge = edges[j];
      const { u, v, w } = edge;


      // Step: Check Edge
      algorithmSteps.push({
        type: 'check',
        message: `Checking edge ${u} → ${v} (weight ${w})`,
        distances: [...dist],
        predecessors: [...currentPredecessors],
        activeEdge: j,
        activeNodes: [u, v],
        updatedNode: null,
        relaxCount: relaxCount
      });


      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        relaxedInThisIteration = true;
        relaxCount++; // Increment relaxation count


        // Step: Relax Edge (update distance)
        algorithmSteps.push({
          type: 'relax',
          message: `Relaxing edge ${u} → ${v}. Distance to ${v} updated to ${dist[v]}.`,
          distances: [...dist],
          predecessors: [...currentPredecessors],
          activeEdge: j,
          activeNodes: [u, v],
          updatedNode: v,
          relaxCount: relaxCount
        });


        // Step: Set Predecessor
        currentPredecessors[v] = u; // Track predecessor
        algorithmSteps.push({
          type: 'set-prev',
          message: `Setting prev[${v}] = ${u}. Node ${u} is now predecessor of ${v}.`,
          distances: [...dist],
          predecessors: [...currentPredecessors],
          activeEdge: j,
          activeNodes: [u, v],
          updatedNode: v,
          relaxCount: relaxCount
        });
      } else {
        algorithmSteps.push({
          type: 'no-relax',
          message: `No relaxation: dist[${u}] + ${w} ≥ dist[${v}]`,
          distances: [...dist],
          activeEdge: j,
          activeNodes: [u, v],
        });
      }
    }


    if (!relaxedInThisIteration) {
      algorithmSteps.push({
        type: 'early-stop',
        message: `No changes in iteration ${i + 1}. Algorithm can stop early.`,
        distances: [...dist],
        activeEdge: null,
        activeNodes: [],
        updatedNode: null
      });
      break;
    }
  }


  // Check for negative cycles
  let hasNegativeCycle = false;
  for (const edge of edges) {
    const { u, v, w } = edge;
    if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
      hasNegativeCycle = true;
      break;
    }
  }


  if (hasNegativeCycle) {
    algorithmSteps.push({
      type: 'negative-cycle',
      message: '⚠️ Negative cycle detected! Shortest paths are undefined.',
      distances: [...dist],
      activeEdge: null,
      activeNodes: [],
      updatedNode: null
    });
  } else {
    algorithmSteps.push({
      type: 'complete',
      message: '✓ Algorithm complete! Shortest paths found.',
      distances: [...dist],
      predecessors: [...currentPredecessors],
      activeEdge: null,
      activeNodes: [],
      updatedNode: null
    });
  }


  return algorithmSteps;
}


function executeStep(step) {
  // Update distances
  distances = [...step.distances];
  if (step.predecessors) predecessors = [...step.predecessors]; // Restore predecessors


  // Calculate execution time
  if (algorithmStartTime) {
    executionTime = Math.round(performance.now() - algorithmStartTime);
    const timeEl = document.getElementById("executionTime");
    if (timeEl) timeEl.textContent = executionTime + "ms";
  }


  // Reset all node states
  nodes.forEach(n => {
    nodeStates[n.id] = n.id === sourceNode ? 'source' : 'default';
  });


  // Apply active node states
  if (step.activeNodes) {
    step.activeNodes.forEach(nodeId => {
      if (nodeId !== sourceNode) {
        nodeStates[nodeId] = 'active';
      }
    });
  }


  // Mark updated node
  if (step.updatedNode !== null) {
    nodeStates[step.updatedNode] = 'updated';
  }


  // Redraw graph with active edge
  drawGraph(step.activeEdge);


  // Update distance table
  renderDistanceTable(step.updatedNode);


  // Update status message
  let msgType = 'info';
  if (step.type === 'relax') msgType = 'success';
  if (step.type === 'negative-cycle') msgType = 'warning';
  if (step.type === 'complete') msgType = 'success';


  setStatusMessage(step.message, msgType);


  // Update code walkthrough highlighting
  highlightCodeForStep(step.type);


  // Update Analysis Relax Count
  const relaxEl = document.getElementById("relaxCount");
  if (relaxEl && step.relaxCount !== undefined) {
    relaxEl.textContent = step.relaxCount;
  }
}


function runNextStep() {
  if (currentStepIndex >= algorithmSteps.length) {
    isAlgorithmComplete = true;
    isPlaying = false;
    const playBtn = $("playPauseBtn");
    if (playBtn) playBtn.textContent = 'Play';
    if (visTimer) {
      clearInterval(visTimer);
      visTimer = null;
    }
    return false;
  }


  executeStep(algorithmSteps[currentStepIndex]);
  currentStepIndex++;
  return true;
}


function resetAlgorithm() {
  // Stop any running animation
  if (visTimer) {
    clearInterval(visTimer);
    visTimer = null;
  }


  isPlaying = false;
  isAlgorithmComplete = false;
  currentStepIndex = 0;
  algorithmSteps = [];


  const playBtn = $("playBtn");
  if (playBtn) playBtn.textContent = 'Play';


  const relaxEl = document.getElementById("relaxCount");
  if (relaxEl) relaxEl.textContent = "0";


  // Clear any highlighted code lines
  highlightCodeLines([]);
}


/* ================= BUTTON HANDLERS ================= */


const randomGraphBtn = $("randomGraphBtn");
if (randomGraphBtn) {
  randomGraphBtn.onclick = randomGraph;
}


const vertexInput = $("vertexCount");


vertexInput.addEventListener("change", () => {
  const value = Number(vertexInput.value);


  if (value < 3 || value > 7) {
    window.alert("Number of vertices must be between 3 and 7.");
    vertexInput.value = 5;
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
      // Start/Resume playing
      if (isAlgorithmComplete || algorithmSteps.length === 0) {
        // Generate fresh steps
        resetAlgorithm();
        initializeDistances();
        generateBellmanFordSteps();
      }


      const speedSelect = $("speedSelect");
      const speed = speedSelect ? Number(speedSelect.value) : 700;


      visTimer = setInterval(() => {
        if (!runNextStep()) {
          clearInterval(visTimer);
          visTimer = null;
        }
      }, speed);


      isPlaying = true;
      playBtn.textContent = 'Pause';
    }
  };
}


const nextBtn = $("nextBtn");
if (nextBtn) {
  nextBtn.onclick = () => {
    // Pause if playing
    if (isPlaying) {
      if (visTimer) {
        clearInterval(visTimer);
        visTimer = null;
      }
      isPlaying = false;
      const playBtn = $("playBtn");
      if (playBtn) playBtn.textContent = 'Play';
    }


    // Generate steps if not done
    if (algorithmSteps.length === 0) {
      generateBellmanFordSteps();
    }


    runNextStep();
  };
}


function runPrevStep() {
  if (currentStepIndex <= 0) {
    setStatusMessage("Already at the beginning of the algorithm.", "info");
    return;
  }


  currentStepIndex--;
  executeStep(algorithmSteps[currentStepIndex]);
}


const prevBtn = $("prevBtn");
if (prevBtn) {
  prevBtn.onclick = () => {
    // Pause if playing
    if (isPlaying) {
      if (visTimer) {
        clearInterval(visTimer);
        visTimer = null;
      }
      isPlaying = false;
      const playBtn = $("playBtn");
      if (playBtn) playBtn.textContent = 'Play';
    }


    // Generate steps if not done
    if (algorithmSteps.length === 0) {
      generateBellmanFordSteps();
    }


    runPrevStep();
  };
}


const handleVisReset = () => {
  resetAlgorithm();
  initializeDistances();
  drawGraph();
  setStatusMessage("Reset. Press Play to run Bellman-Ford algorithm.", "info");
};


const resetBtn = $('resetBtn');
if (resetBtn) {
  resetBtn.onclick = handleVisReset;
}


// Source node selector handler




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
    manual.edges.forEach((e, idx) => drawEdge(e, idx));
    manual.nodes.forEach(drawNode);
  }


  /* ================= EDGE ================= */


  function drawEdge(e, index) {
    const dx = e.x2 - e.x1;
    const dy = e.y2 - e.y1;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;


    const x1 = e.x1 + ux * NODE_R;
    const y1 = e.y1 + uy * NODE_R;
    const x2 = e.x2 - ux * NODE_R;
    const y2 = e.y2 - uy * NODE_R;


    const group = svg("g", { class: "edge-group" });


    const line = svg("line", {
      x1, y1, x2, y2,
      class: "manual-edge",
      "marker-end": "url(#arrow-manual)"
    });
    group.appendChild(line);


    const hit = svg("line", {
      x1, y1, x2, y2,
      class: "edge-hit"
    });
    group.appendChild(hit);


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
      class: "edge-weight-bg",
      "pointer-events": "none"
    });


    const text = svg("text", {
      x: tx,
      y: ty + 5,
      class: "edge-weight editable"
    });
    text.textContent = e.w;
    text.addEventListener("click", (evt) => {
      evt.stopPropagation();
      editManualEdgeWeight(index);
    });


    // delete badge
    const deleteOffset = 26;
    const delX = (x1 + x2) / 2 + (-uy * deleteOffset);
    const delY = (y1 + y2) / 2 + (ux * deleteOffset);
    const delGroup = svg("g", { class: "edge-delete" });
    const delCircle = svg("circle", { cx: delX, cy: delY, r: 10 });
    const delText = svg("text", { x: delX, y: delY + 1 });
    delText.textContent = "×";


    delGroup.appendChild(delCircle);
    delGroup.appendChild(delText);
    delGroup.addEventListener("click", (evt) => {
      evt.stopPropagation();
      removeEdgeAt(index);
    });


    group.appendChild(bg);
    group.appendChild(text);
    group.appendChild(delGroup);


    manualSvg.appendChild(group);
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


  function removeEdgeAt(index) {
    const edge = manual.edges[index];
    if (!edge) return;
    manual.edges.splice(index, 1);
    manual.edgeSet.delete(`${edge.u}->${edge.v}`);
    draw();
  }


  function editManualEdgeWeight(index) {
    const edge = manual.edges[index];
    if (!edge) return;
    const input = window.prompt("Enter new weight for this edge", edge.w);
    if (input === null) return;


    const newWeight = Number(input);
    if (Number.isNaN(newWeight)) {
      window.alert("Please enter a valid number.");
      return;
    }


    manual.edges[index].w = newWeight;
    draw();
  }


  /* ================= DAG VALIDATION ================= */


  function validateAndApply() {
    // For Bellman-Ford, cycles and self-loops are allowed.
    // We just take the edges as is.
    var manualEdges = manual.edges.map(e => ({
      u: e.u,
      v: e.v,
      w: e.w
    }));


    edges = manualEdges;


    // Recalculate node positions to center in the main graph SVG
    const n = manual.nodes.length;
    const mainSvg = $("graphSvg");
    const { width, height } = mainSvg.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;
    const margin = 60;
    const r = Math.min(cx, cy) - margin;


    // Create centered nodes for the main graph
    nodes = [];
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      nodes.push({
        id: i,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      });
    }


    // Sync Vertex Count Input
    const vInput = $("vertexCount");
    if (vInput) vInput.value = nodes.length;


    // Reset algorithm state
    resetAlgorithm();


    // Initialize distances and inputs
    initializeDistances();
    updateSourceNodeSelector();


    // Update Complexity O(VE)
    const complexity = nodes.length * edges.length;
    const complexityEl = document.getElementById("complexityValue");
    if (complexityEl) complexityEl.textContent = `O(${complexity})`;


    drawGraph();
    closeManualEditor();
    setStatusMessage("Manual graph applied. Press Play to run Bellman-Ford algorithm.", "info");
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