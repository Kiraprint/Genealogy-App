import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Person, Relationship, RelationshipType, Gender } from '../types';

interface GraphVisualizerProps {
  people: Person[];
  relationships: Relationship[];
  onSelectPerson: (id: string) => void;
  selectedPersonId: string | null;
  isDarkMode?: boolean;
  visibleRelTypes: RelationshipType[];
  onToggleRelType: (type: RelationshipType) => void;
  onProximityDrop: (sourceId: string, targetId: string) => void;
}

const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  people,
  relationships,
  onSelectPerson,
  selectedPersonId,
  isDarkMode = false,
  visibleRelTypes,
  onToggleRelType,
  onProximityDrop
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || people.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // --- Colors ---
    const textColor = isDarkMode ? "#e5e7eb" : "#333333";
    const linkColor = isDarkMode ? "#94a3b8" : "#64748b";
    const spouseColor = "#ec4899"; 
    
    // --- Cleanup ---
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // --- Markers ---
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 38)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", linkColor);

    const g = svg.append("g");
    
    // Layers
    const linkLayer = g.append("g").attr("class", "links").attr("fill", "none");
    const nodeLayer = g.append("g").attr("class", "nodes");
    const interactionLayer = g.append("g").attr("class", "interaction");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // --- 1. Generation & Level Calculation ---
    const nodeLevels: Record<string, number> = {};
    people.forEach(p => nodeLevels[p.id] = 0);
    
    // Propagate levels down
    for (let i = 0; i < people.length * 2; i++) {
        let changed = false;
        relationships.forEach(r => {
            if (r.type === RelationshipType.Parent) {
                if (nodeLevels[r.target] <= nodeLevels[r.source]) {
                    nodeLevels[r.target] = nodeLevels[r.source] + 1;
                    changed = true;
                }
            } else if (r.type === RelationshipType.Spouse) {
                 if (nodeLevels[r.source] !== nodeLevels[r.target]) {
                    const max = Math.max(nodeLevels[r.source], nodeLevels[r.target]);
                    nodeLevels[r.source] = max;
                    nodeLevels[r.target] = max;
                    changed = true;
                 }
            }
        });
        if (!changed) break;
    }

    const levels = Object.values(nodeLevels);
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);
    const generationGap = 160; // Increased gap for curves
    const treeHeight = (maxLevel - minLevel) * generationGap;
    const startY = (height - treeHeight) / 2;

    // --- 2. Smart Horizontal Initialization (Heuristic Untangling) ---
    // Instead of random X, we try to place children near parents.
    
    // Group people by level
    const peopleByLevel: Record<number, Person[]> = {};
    people.forEach(p => {
      const lvl = nodeLevels[p.id];
      if (!peopleByLevel[lvl]) peopleByLevel[lvl] = [];
      peopleByLevel[lvl].push(p);
    });

    const initialX: Record<string, number> = {};
    const processed = new Set<string>();
    const nodeSpacing = 140;

    // Process levels from top to bottom
    for (let lvl = minLevel; lvl <= maxLevel; lvl++) {
        const row = peopleByLevel[lvl] || [];
        
        // Sort current row:
        // 1. If has parent processed, sort by parent X
        // 2. If spouse processed, next to spouse
        row.sort((a, b) => {
           const getParentX = (pid: string) => {
               const parentRel = relationships.find(r => r.target === pid && r.type === RelationshipType.Parent);
               if (parentRel && initialX[parentRel.source] !== undefined) return initialX[parentRel.source];
               return null;
           };
           const ax = getParentX(a.id);
           const bx = getParentX(b.id);
           
           if (ax !== null && bx !== null) return ax - bx;
           if (ax !== null) return -1;
           if (bx !== null) return 1;
           return 0; // Keep original order if no parents found
        });

        // Assign X positions
        let currentX = width / 2 - (row.length * nodeSpacing) / 2;
        row.forEach(p => {
             // If spouse already placed, place next to them
             const spouseRel = relationships.find(r => r.type === RelationshipType.Spouse && (r.source === p.id || r.target === p.id));
             if (spouseRel) {
                 const spouseId = spouseRel.source === p.id ? spouseRel.target : spouseRel.source;
                 if (processed.has(spouseId) && initialX[spouseId] !== undefined) {
                     // Place to the right of spouse
                     initialX[p.id] = initialX[spouseId] + nodeSpacing;
                     currentX = initialX[p.id] + nodeSpacing; // Advance cursor
                     processed.add(p.id);
                     return;
                 }
             }

             initialX[p.id] = currentX;
             currentX += nodeSpacing;
             processed.add(p.id);
        });
    }

    // --- 3. Simulation Setup ---
    const nodes = people.map(p => ({ 
        ...p,
        // Use smart initial positions
        x: initialX[p.id] || width / 2,
        y: startY + (nodeLevels[p.id] - minLevel) * generationGap
    }));

    const filteredRelationships = relationships.filter(r => visibleRelTypes.includes(r.type));
    const links = filteredRelationships.map(r => ({ ...r }));

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links)
          .id((d: any) => d.id)
          .distance(d => (d as any).type === RelationshipType.Spouse ? 80 : 120) // Spouses closer
          .strength(d => (d as any).type === RelationshipType.Spouse ? 1.5 : 0.5) // Spouses bind tighter
      )
      .force("charge", d3.forceManyBody().strength(-800)) // Repulsion
      .force("collide", d3.forceCollide().radius(50).iterations(2)) // Prevent overlap
      // Strict Y layering
      .force("y", d3.forceY((d: any) => startY + (nodeLevels[d.id] - minLevel) * generationGap).strength(3)) 
      // Weak X force to keep general structure but allow "untangling"
      .force("x", d3.forceX((d: any) => initialX[d.id] || width/2).strength(0.2));

    // --- 4. Rendering ---
    
    // Using paths instead of lines for curves
    const linkPath = linkLayer
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("stroke-width", d => d.type === RelationshipType.Spouse ? 2 : 2)
      .attr("stroke-dasharray", d => d.type === RelationshipType.Spouse ? "5,5" : "")
      .attr("stroke", d => d.type === RelationshipType.Spouse ? spouseColor : linkColor)
      .attr("marker-end", d => d.type === RelationshipType.Parent ? "url(#arrowhead)" : null);

    const node = nodeLayer
      .attr("stroke", isDarkMode ? "#1f2937" : "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("id", d => `node-${d.id}`)
      .attr("cursor", "grab")
      .call(drag(simulation, interactionLayer) as any)
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectPerson(d.id);
      });

    node.append("circle")
      .attr("class", "node-circle")
      .attr("r", 30)
      .attr("fill", d => {
        if (d.id === selectedPersonId) return "#facc15"; 
        return d.gender === Gender.Female ? "#fbcfe8" : "#bfdbfe"; 
      })
      .attr("stroke", d => d.id === selectedPersonId ? "#ea580c" : (isDarkMode ? "#1f2937" : "#fff"))
      .attr("stroke-width", d => d.id === selectedPersonId ? 3 : 1.5);

    node.append("rect")
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("x", -40)
      .attr("y", 35)
      .attr("width", 80)
      .attr("height", 20)
      .attr("fill", isDarkMode ? "rgba(31, 41, 55, 0.8)" : "rgba(255, 255, 255, 0.8)")
      .attr("stroke", "none");

    node.append("text")
      .attr("x", 0)
      .attr("y", 48)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", textColor)
      .attr("stroke", "none")
      .text(d => `${d.firstName} ${d.lastName}`);

    // --- Tick Function ---
    simulation.on("tick", () => {
      linkPath.attr("d", (d: any) => {
          // Curve Logic
          const sx = d.source.x;
          const sy = d.source.y;
          const tx = d.target.x;
          const ty = d.target.y;

          if (d.type === RelationshipType.Spouse) {
              // Straight horizontal-ish line for spouses
              return `M${sx},${sy} L${tx},${ty}`;
          } else {
              // Cubic Bezier for Parent-Child (Vertical Tree style)
              // Control points: halfway vertically
              const midY = (sy + ty) / 2;
              return `M${sx},${sy + 30} C${sx},${midY} ${tx},${midY} ${tx},${ty - 30}`;
          }
      });

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [people, relationships, selectedPersonId, onSelectPerson, isDarkMode, visibleRelTypes]);


  // Drag Helper
  function drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>, interactionLayer: d3.Selection<SVGGElement, unknown, null, undefined>) {
    let closestNode: any = null;

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
      d3.select(event.sourceEvent.target.parentNode).attr("cursor", "grabbing");
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;

      closestNode = null;
      let minDistance = 150; 

      simulation.nodes().forEach((n: any) => {
          if (n.id === event.subject.id) return;
          const dx = n.x - event.x;
          const dy = n.y - event.y;
          const distance = Math.sqrt(dx*dx + dy*dy);
          if (distance < minDistance) {
              closestNode = n;
          }
      });

      d3.selectAll('.node-circle').attr('stroke', (d: any) => {
          if (d.id === selectedPersonId) return "#ea580c";
          if (closestNode && d.id === closestNode.id) return "#22c55e"; 
          return isDarkMode ? "#1f2937" : "#fff";
      }).attr('stroke-width', (d: any) => {
          if (closestNode && d.id === closestNode.id) return 4;
          return d.id === selectedPersonId ? 3 : 1.5;
      });

      if (closestNode) {
          interactionLayer.selectAll(".snap-line")
            .data([1])
            .join("line")
            .attr("class", "snap-line")
            .attr("x1", event.x)
            .attr("y1", event.y)
            .attr("x2", closestNode.x)
            .attr("y2", closestNode.y)
            .attr("stroke", "#22c55e")
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "8,4")
            .attr("stroke-linecap", "round");
      } else {
          interactionLayer.selectAll(".snap-line").remove();
      }
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
      d3.select(event.sourceEvent.target.parentNode).attr("cursor", "grab");

      interactionLayer.selectAll(".snap-line").remove();

      d3.selectAll('.node-circle').attr('stroke', (d: any) => {
        if (d.id === selectedPersonId) return "#ea580c";
        return isDarkMode ? "#1f2937" : "#fff";
      }).attr('stroke-width', (d: any) => {
        return d.id === selectedPersonId ? 3 : 1.5;
      });

      if (closestNode) {
          onProximityDrop(event.subject.id, closestNode.id);
      }
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  const getLegendStyle = (type: RelationshipType) => {
      return visibleRelTypes.includes(type) ? 'opacity-100 font-bold' : 'opacity-50 grayscale';
  }

  return (
    <div ref={containerRef} className="w-full h-full graph-container relative overflow-hidden">
       <svg ref={svgRef} className="w-full h-full block" />
       <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg text-xs space-y-2 border border-gray-200 dark:border-gray-700 transition-colors select-none z-10">
         <h4 className="font-bold text-gray-700 dark:text-gray-300">Легенда (Фильтр)</h4>
         <div className="flex items-center gap-2">
           <span className="w-3 h-3 rounded-full bg-blue-200 border border-white dark:border-gray-800"></span>
           <span className="text-gray-600 dark:text-gray-400">Мужчина</span>
         </div>
         <div className="flex items-center gap-2">
           <span className="w-3 h-3 rounded-full bg-pink-200 border border-white dark:border-gray-800"></span>
           <span className="text-gray-600 dark:text-gray-400">Женщина</span>
         </div>
         
         <div 
            onClick={() => onToggleRelType(RelationshipType.Parent)}
            className={`flex items-center gap-2 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded ${getLegendStyle(RelationshipType.Parent)}`}
         >
           {/* Bezier curve icon */}
           <svg width="32" height="12" viewBox="0 0 32 12" className="overflow-visible">
               <path d="M0,10 C16,10 16,0 32,0" fill="none" stroke={isDarkMode ? "#94a3b8" : "#64748b"} strokeWidth="2" markerEnd="url(#arrowhead)"/>
           </svg>
           <span className="text-gray-600 dark:text-gray-400">Родитель → Ребенок</span>
         </div>

         <div 
             onClick={() => onToggleRelType(RelationshipType.Spouse)}
             className={`flex items-center gap-2 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded ${getLegendStyle(RelationshipType.Spouse)}`}
         >
           <span className="w-8 h-[2px] bg-pink-500 border-dashed border-t-2" style={{borderStyle: 'dashed'}}></span>
           <span className="text-gray-600 dark:text-gray-400">Супруги</span>
         </div>

         <div 
             onClick={() => onToggleRelType(RelationshipType.Sibling)}
             className={`flex items-center gap-2 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded ${getLegendStyle(RelationshipType.Sibling)}`}
         >
           <span className="w-8 h-[2px] bg-green-500"></span>
           <span className="text-gray-600 dark:text-gray-400">Братья/Сестры</span>
         </div>
       </div>
    </div>
  );
};

export default GraphVisualizer;