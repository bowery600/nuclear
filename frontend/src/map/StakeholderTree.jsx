import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import {
  GitBranch,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
  Zap,
  Building2,
  TrendingUp,
  Globe
} from "lucide-react";
import { useDialogFocus } from "../hooks/useDialogFocus";

export default function StakeholderTree({ plant, ownership, onClose }) {
  const dialogRef = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Parse direct properties from GeoJSON plant feature or fallback to API plant details
  const plantProps = plant?.properties || {};
  const plantNameText = plantProps.plant_name || ownership?.plant?.plant_name || "Nuclear Plant";
  const stateText = plantProps.state || "";
  const capacityText = plantProps.total_mw_capacity || "";
  useDialogFocus(dialogRef, onClose, { initialFocus: ".icon-button" });

  // 1. Convert ownership API payload to D3 hierarchical structure
  const buildTreeData = () => {
    if (!ownership) return null;

    const root = {
      id: "root",
      name: plantNameText,
      type: "plant",
      state: stateText,
      capacity: capacityText,
      children: []
    };

    const stakes = ownership.ownership_stakes || [];
    stakes.forEach((stake, index) => {
      const ownerId = `owner-${index}`;
      const ownerNode = {
        id: ownerId,
        name: stake.owner_name,
        type: "owner",
        equity: Number(stake.equity_percentage) || 100,
        children: []
      };

      if (stake.parent_company) {
        const parentId = `parent-${index}`;
        const parentNode = {
          id: parentId,
          name: stake.parent_company.parent_company_name,
          type: "parent",
          ticker: stake.parent_company.stock_ticker,
          children: []
        };

        const shareholders = stake.shareholders || [];
        shareholders.forEach((sh, shIdx) => {
          parentNode.children.push({
            id: `sh-${index}-${shIdx}`,
            name: sh.institutional_investor_name,
            type: "shareholder",
            holding: Number(sh.ownership_percentage) || 0,
            reported: sh.reported_at
          });
        });

        // Only add parent if it's different from the direct owner or has children
        if (
          stake.parent_company.parent_company_name !== stake.owner_name ||
          shareholders.length > 0
        ) {
          ownerNode.children.push(parentNode);
        } else if (shareholders.length > 0) {
          // If names are identical, just bind shareholders to the owner directly
          shareholders.forEach((sh, shIdx) => {
            ownerNode.children.push({
              id: `sh-dir-${index}-${shIdx}`,
              name: sh.institutional_investor_name,
              type: "shareholder",
              holding: Number(sh.ownership_percentage) || 0,
              reported: sh.reported_at
            });
          });
        }
      }

      root.children.push(ownerNode);
    });

    return root;
  };

  useEffect(() => {
    if (!ownership || !svgRef.current) return;

    const treeData = buildTreeData();
    if (!treeData) return;

    // Set initial selected node to plant root
    setSelectedNodeData(treeData);

    const svgElement = svgRef.current;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous SVG content
    d3.select(svgElement).selectAll("*").remove();

    // Create D3 SVG selections
    const svg = d3.select(svgElement)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Define defs for filters and gradients
    const defs = svg.append("defs");

    // Glow filter definition
    const glowFilter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-30%")
      .attr("y", "-30%")
      .attr("width", "160%")
      .attr("height", "160%");

    glowFilter.append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "blur");

    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Gradients for paths
    const linkGradient = defs.append("linearGradient")
      .attr("id", "link-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    linkGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#06b6d4") // Cyan
      .attr("stop-opacity", 0.85);

    linkGradient.append("stop")
      .attr("offset", "50%")
      .attr("stop-color", "#eab308") // Yellow
      .attr("stop-opacity", 0.75);

    linkGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#a855f7") // Purple
      .attr("stop-opacity", 0.85);

    // Create main drawing group
    const g = svg.append("g")
      .attr("class", "tree-g");

    // Set up D3 Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomScale(event.transform.k);
      });

    svg.call(zoom);

    // D3 Hierarchy layout initialization
    const root = d3.hierarchy(treeData);
    
    // Set initial position
    root.x0 = height / 2;
    root.y0 = 60;

    // Collapse helper function
    function collapse(d) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    // Collapse deep nodes initially to prevent cluttering
    // Keep level 0 (Plant) and level 1 (Owners) open, collapse shareholders initially
    root.children?.forEach(d => {
      d.children?.forEach(collapse);
    });

    let i = 0;
    let computedHeight = Math.max(height - 40, root.leaves().length * 65);
    update(root);

    // D3 Tree Render Update Cycle
    function update(source) {
      const nodeWidth = 240; // Horizontal spacing step

      // Calculate temporary tree size based on open nodes
      const leafCount = root.leaves().length;
      computedHeight = Math.max(height - 40, leafCount * 65);

      // Create tree layout
      const treeLayout = d3.tree().size([computedHeight, width - 120]);
      const treeDataStructure = treeLayout(root);

      const nodes = treeDataStructure.descendants();
      const links = treeDataStructure.links();

      // Normalize coordinate step size for horizontal layout
      nodes.forEach(d => {
        d.y = d.depth * nodeWidth + 120;
      });

      // --- Node Operations ---
      const node = g.selectAll("g.node")
        .data(nodes, d => d.id || (d.id = ++i));

      // Enter new nodes at parent's previous position
      const nodeEnter = node.enter().append("g")
        .attr("class", d => `node node-${d.data.type}`)
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .on("click", (event, d) => {
          // Toggle collapsed status
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          setSelectedNodeData(d.data);
          update(d);
        })
        .on("mouseover", (event, d) => {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style("opacity", 1);
          
          let tooltipHtml = "";
          if (d.data.type === "plant") {
            tooltipHtml = `
              <div class="tt-header">
                <span class="tt-tag tt-tag-plant">Plant</span>
                <strong>${d.data.name}</strong>
              </div>
              <div class="tt-body">
                <div>State: <span>${d.data.state}</span></div>
                <div>Capacity: <span>${d.data.capacity} MW</span></div>
              </div>
            `;
          } else if (d.data.type === "owner") {
            tooltipHtml = `
              <div class="tt-header">
                <span class="tt-tag tt-tag-owner">Operator Stake</span>
                <strong>${d.data.name}</strong>
              </div>
              <div class="tt-body">
                <div>Equity Share: <span class="highlight">${d.data.equity}%</span></div>
              </div>
            `;
          } else if (d.data.type === "parent") {
            tooltipHtml = `
              <div class="tt-header">
                <span class="tt-tag tt-tag-parent">Parent Corporation</span>
                <strong>${d.data.name}</strong>
              </div>
              <div class="tt-body">
                <div>Stock Ticker: <span>${d.data.ticker}</span></div>
              </div>
            `;
          } else if (d.data.type === "shareholder") {
            tooltipHtml = `
              <div class="tt-header">
                <span class="tt-tag tt-tag-sh">Shareholder</span>
                <strong>${d.data.name}</strong>
              </div>
              <div class="tt-body">
                <div>Institutional Holding: <span class="highlight">${d.data.holding}%</span></div>
                <div>Reported: <span>${d.data.reported || "N/A"}</span></div>
              </div>
            `;
          }

          tooltip.html(tooltipHtml)
            .style("left", `${event.clientX + 16}px`)
            .style("top", `${event.clientY - 20}px`);
        })
        .on("mousemove", (event) => {
          d3.select(tooltipRef.current)
            .style("left", `${event.clientX + 16}px`)
            .style("top", `${event.clientY - 20}px`);
        })
        .on("mouseout", () => {
          d3.select(tooltipRef.current).style("opacity", 0);
        });

      // Node avatars / shapes
      nodeEnter.append("circle")
        .attr("r", 1e-6)
        .style("fill", d => getNodeColor(d.data.type))
        .style("stroke-width", "2px");

      // Little indicator if collapsible
      nodeEnter.append("circle")
        .attr("class", "node-toggle-indicator")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 5)
        .style("fill", "#fff")
        .style("stroke", "#0f172a")
        .style("stroke-width", "1.5px")
        .style("opacity", d => (d.children || d._children) ? 1 : 0);

      // Node Label Text
      nodeEnter.append("text")
        .attr("dy", ".31em")
        .attr("x", d => (d.children || d._children) ? -16 : 16)
        .attr("text-anchor", d => (d.children || d._children) ? "end" : "start")
        .text(d => formatNodeLabel(d.data))
        .style("fill-opacity", 1e-6)
        .style("font-size", "11px")
        .style("font-weight", d => d.data.type === "plant" ? "800" : "500")
        .style("text-shadow", "0 2px 4px rgba(0,0,0,0.85)");

      // Merge and Transition Nodes
      const nodeUpdate = nodeEnter.merge(node);
      const transitionDuration = 450;

      nodeUpdate.transition()
        .duration(transitionDuration)
        .attr("transform", d => `translate(${d.y},${d.x})`);

      nodeUpdate.select("circle")
        .attr("r", d => (d.data.type === "plant" ? 10 : 7))
        .style("fill", d => getNodeColor(d.data.type))
        .style("stroke", d => (d._children ? "#eab308" : "#94a3b8")) // Golden if collapsed
        .style("filter", d => d.data.type === "plant" ? "url(#glow)" : "none");

      nodeUpdate.select(".node-toggle-indicator")
        .style("opacity", d => (d.children || d._children) ? 1 : 0)
        .style("fill", d => d._children ? "#eab308" : "#22d3ee")
        .attr("cx", d => (d.children || d._children) ? 0 : 0)
        .attr("cy", d => (d.children || d._children) ? 0 : 0);

      nodeUpdate.select("text")
        .style("fill-opacity", 1);

      // Transition exiting nodes
      const nodeExit = node.exit().transition()
        .duration(transitionDuration)
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .remove();

      nodeExit.select("circle").attr("r", 1e-6);
      nodeExit.select("text").style("fill-opacity", 1e-6);

      // --- Link Operations ---
      const link = g.selectAll("path.link")
        .data(links, d => d.target.id);

      // Curved link generator
      const curveGenerator = d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x);

      // Enter new links at parent's old position
      const linkEnter = link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", d => {
          const o = { x: source.x0, y: source.y0 };
          return curveGenerator({ source: o, target: o });
        })
        .style("fill", "none")
        .style("stroke", "url(#link-grad)")
        .style("stroke-opacity", 0.4)
        .style("stroke-width", d => getLinkWidth(d.target.data));

      // Transition links
      const linkUpdate = linkEnter.merge(link);

      linkUpdate.transition()
        .duration(transitionDuration)
        .attr("d", curveGenerator)
        .style("stroke-opacity", 0.5)
        .style("stroke-width", d => getLinkWidth(d.target.data));

      // Transition exiting links
      link.exit().transition()
        .duration(transitionDuration)
        .attr("d", d => {
          const o = { x: source.x, y: source.y };
          return curveGenerator({ source: o, target: o });
        })
        .remove();

      // Store positions for animations
      nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Dynamic color coding
    function getNodeColor(type) {
      switch (type) {
        case "plant": return "#22d3ee"; // Cyan
        case "owner": return "#eab308"; // Gold
        case "parent": return "#a855f7"; // Purple
        case "shareholder": return "#38bdf8"; // Slate blue
        default: return "#94a3b8";
      }
    }

    // Formatting titles
    function formatNodeLabel(data) {
      if (data.type === "plant") return data.name;
      if (data.type === "owner") return `${data.name} (${data.equity}%)`;
      if (data.type === "parent") return `${data.name} [${data.ticker}]`;
      if (data.type === "shareholder") return `${data.name} (${data.holding}%)`;
      return data.name;
    }

    // Dynamic link thickness representing equity/holdings
    function getLinkWidth(targetData) {
      if (targetData.type === "owner") {
        return `${Math.max(1.8, (targetData.equity / 100) * 8.5)}px`;
      }
      if (targetData.type === "parent") {
        return "2.5px"; // Solid corporate tie
      }
      if (targetData.type === "shareholder") {
        return `${Math.max(1, (targetData.holding / 100) * 11)}px`;
      }
      return "1.5px";
    }

    // Initial Zoom/Pan to Center Tree
    const initialTransform = d3.zoomIdentity.translate(40, height / 2 - computedHeight / 2).scale(0.85);
    svg.transition().duration(600).call(zoom.transform, initialTransform);

    // Zoom Controls
    d3.select("#zoom-in").on("click", () => svg.transition().duration(200).call(zoom.scaleBy, 1.25));
    d3.select("#zoom-out").on("click", () => svg.transition().duration(200).call(zoom.scaleBy, 0.8));
    d3.select("#zoom-reset").on("click", () => {
      const resetTransform = d3.zoomIdentity.translate(40, height / 2 - computedHeight / 2).scale(0.85);
      svg.transition().duration(400).call(zoom.transform, resetTransform);
    });

  }, [ownership]);

  return (
    <div ref={dialogRef} className="tree-overlay" role="dialog" aria-modal="true" aria-labelledby="tree-title">
      <div className="tree-window">
        {/* Header Block */}
        <header className="tree-header">
          <div>
            <div className="tree-brand">
              <GitBranch size={20} className="glow-icon" />
              <span className="eyebrow">Interactive Stakeholder Tree</span>
            </div>
            <h2 id="tree-title">{plantNameText} Ownership Matrix</h2>
            <p className="tree-subtitle">
              {stateText && `State: ${stateText}`}
              {capacityText && ` • Nameplate Capacity: ${Number(capacityText).toLocaleString()} MW`}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close Stakeholder Tree">
            <X size={20} />
          </button>
        </header>

        {/* Workspace Panels */}
        <div className="tree-body-wrapper">
          {/* D3 Canvas container */}
          <div className="tree-canvas-container" ref={containerRef}>
            <svg ref={svgRef} className="tree-svg"></svg>
            
            {/* Zoom Controls */}
            <div className="zoom-controls">
              <button id="zoom-in" title="Zoom In" aria-label="Zoom In"><Maximize2 size={16} /></button>
              <button id="zoom-out" title="Zoom Out" aria-label="Zoom Out"><Minimize2 size={16} /></button>
              <button id="zoom-reset" title="Reset View" aria-label="Reset View"><RefreshCw size={16} /></button>
              <span className="scale-indicator">Scale: {Math.round(zoomScale * 100)}%</span>
            </div>
          </div>

          {/* Interactive Sidebar Panel */}
          <aside className="tree-sidebar">
            <div className="sidebar-section">
              <span className="eyebrow">Inspector</span>
              {selectedNodeData ? (
                <div className="inspect-card">
                  <div className={`inspect-type inspect-type-${selectedNodeData.type}`}>
                    {selectedNodeData.type.toUpperCase()}
                  </div>
                  <h3>{selectedNodeData.name}</h3>

                  {selectedNodeData.type === "plant" && (
                    <div className="inspect-details">
                      <div className="inspect-row">
                        <Zap size={14} />
                        <span>Capacity</span>
                        <strong>{Number(selectedNodeData.capacity).toLocaleString()} MW</strong>
                      </div>
                      <div className="inspect-row">
                        <Globe size={14} />
                        <span>State</span>
                        <strong>{selectedNodeData.state}</strong>
                      </div>
                    </div>
                  )}

                  {selectedNodeData.type === "owner" && (
                    <div className="inspect-details">
                      <div className="inspect-row">
                        <TrendingUp size={14} />
                        <span>Equity Share</span>
                        <strong className="text-cyan">{selectedNodeData.equity}%</strong>
                      </div>
                      <p className="helper-text">
                        Direct joint-owner of the physical plant site.
                      </p>
                    </div>
                  )}

                  {selectedNodeData.type === "parent" && (
                    <div className="inspect-details">
                      <div className="inspect-row">
                        <Building2 size={14} />
                        <span>Stock Ticker</span>
                        <strong>{selectedNodeData.ticker}</strong>
                      </div>
                      <p className="helper-text">
                        Parent corporation directing operational management. Traded on public exchanges.
                      </p>
                    </div>
                  )}

                  {selectedNodeData.type === "shareholder" && (
                    <div className="inspect-details">
                      <div className="inspect-row">
                        <TrendingUp size={14} />
                        <span>Institutional Holding</span>
                        <strong className="text-yellow">{selectedNodeData.holding}%</strong>
                      </div>
                      <div className="inspect-row">
                        <span>Reported Date</span>
                        <strong>{selectedNodeData.reported || "N/A"}</strong>
                      </div>
                      <p className="helper-text">
                        Top 10 institutional fund managing equity stake in the parent utility corporation.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-inspect">
                  <p>Click any node in the diagram to inspect its structural and financial details.</p>
                </div>
              )}
            </div>

            {/* Quick guide list */}
            <div className="sidebar-section guide-section">
              <span className="eyebrow">Structural Key</span>
              <ul className="guide-list">
                <li><span className="dot dot-plant"></span> <span>Operating Nuclear Plant</span></li>
                <li><span className="dot dot-owner"></span> <span>Direct Stakeholder (Equity)</span></li>
                <li><span className="dot dot-parent"></span> <span>Parent Corporation (Public)</span></li>
                <li><span className="dot dot-sh"></span> <span>Top Institutional Shareholders</span></li>
              </ul>
              <div className="tree-tips">
                <strong>Tips:</strong>
                <ul>
                  <li>Drag the background to pan.</li>
                  <li>Use scroll wheel or pinch to zoom.</li>
                  <li>Click nodes with glowing borders to expand or collapse.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Floating hover tooltip */}
      <div className="glass-tooltip" ref={tooltipRef} style={{ opacity: 0 }}></div>
    </div>
  );
}
