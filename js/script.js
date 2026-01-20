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

  // Bellman-Ford Globals
  let nodes = [];
  let edges = [];
  let sourceNode = 0;
  let distances = [];
  let predecessors = []; // Add global predecessors
  let nodeStates = {};
  let isPlaying = false;
  let algorithmSteps = []; // Track algorithm steps

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
      randomGraph();
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
    const tableDiv = $("distanceTable");
    if (!tableDiv) return;

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
          currentPredecessors[v] = u; // Track predecessor
          relaxedInThisIteration = true;
          relaxCount++; // Increment relaxation count

          // Step: Relax Edge
          algorithmSteps.push({
            type: 'relax',
            message: `Relaxing edge ${u} → ${v}. Distance to ${v} updated to ${dist[v]}.`,
            distances: [...dist],
            predecessors: [...currentPredecessors], // Snapshot predecessors
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
        const playBtn = $("playPauseBtn");
        if (playBtn) playBtn.textContent = 'Play';
      }

      // Generate steps if not done
      if (algorithmSteps.length === 0) {
        generateBellmanFordSteps();
      }

      runNextStep();
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
      // For Bellman-Ford, cycles and self-loops are allowed.
      // We just take the edges as is.
      var manualEdges = manual.edges.map(e => ({
        u: e.u,
        v: e.v,
        w: e.w
      }));

      edges = manualEdges;
      createNodes(manual.nodes.length); // Ensure global nodes match manual nodes count/pos? 
      // Actually manual.nodes has positions. global nodes array should match.
      // We need to sync global 'nodes' with 'manual.nodes' positions if they differ?
      // manual.nodes has {id, x, y}. global nodes has {id, x, y}.
      // manual.nodes might have different count.

      // Update global nodes
      nodes = manual.nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));

      // Sync Vertex Count Input
      const vInput = $("vertexCount");
      if (vInput) vInput.value = nodes.length;

      // Reset algorithm state
      resetAlgorithm();

      // Initialize distances and inputs
      initializeDistances();
      updateSourceNodeSelector();

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
