import React, { useEffect, useRef, useMemo } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { useGraphStore } from '../../store/graphStore';
import { colorByRiskTier } from '../../lib/colorScale';
import { nodeSize, edgeSize } from '../../lib/graphUtils';

export function SybilGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const { nodes, edges, whatIfNode, whatIfResult, selectedNode, fetchGraph, selectNode, setHoveredNode, runWhatIf } = useGraphStore();

  // Build graph when data changes
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Cleanup previous instance
    if (sigmaRef.current) { sigmaRef.current.kill(); sigmaRef.current = null; }

    const graph = new Graph();
    graphRef.current = graph;

    // Add nodes
    nodes.forEach((node) => {
      graph.addNode(node.id, {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        size: nodeSize(node.fragility_score),
        color: colorByRiskTier(node.risk_tier || 'low'),
        label: node.name,
        department: node.department,
        risk_tier: node.risk_tier || 'low',
        fragility: node.fragility_score || 0,
        originalColor: colorByRiskTier(node.risk_tier || 'low'),
        originalSize: nodeSize(node.fragility_score),
      });
    });

    // Add edges (deduplicate)
    const edgeSet = new Set<string>();
    edges.forEach((edge) => {
      if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) return;
      const key = `${edge.source}->${edge.target}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      try {
        graph.addEdge(edge.source, edge.target, {
          size: edgeSize(edge.weight),
          color: 'rgba(121,134,203,0.12)',
          originalColor: 'rgba(121,134,203,0.12)',
          weight: edge.weight,
        });
      } catch { /* duplicate edge — skip */ }
    });

    // Run ForceAtlas2 layout
    forceAtlas2.assign(graph, {
      iterations: 200,
      settings: {
        gravity: 2,
        scalingRatio: 8,
        strongGravityMode: true,
        edgeWeightInfluence: 1,
        barnesHutOptimize: graph.order > 500,
      },
    });

    // Create Sigma instance
    const sigma = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelColor: { color: '#e8eaf6' },
      labelFont: 'IBM Plex Mono',
      labelSize: 11,
      labelRenderedSizeThreshold: 8,
      defaultEdgeType: 'line',
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
    });

    sigmaRef.current = sigma;

    // Event handlers
    sigma.on('enterNode', ({ node }) => {
      const nodeData = nodes.find(n => n.id === node);
      if (nodeData) setHoveredNode(nodeData);

      // Highlight adjacent edges and dim others
      const neighbors = new Set(graph.neighbors(node));
      neighbors.add(node);

      graph.forEachNode((n, attrs) => {
        if (!neighbors.has(n)) {
          graph.setNodeAttribute(n, 'color', 'rgba(255,255,255,0.08)');
        } else {
          graph.setNodeAttribute(n, 'color', attrs.originalColor);
          if (n === node) graph.setNodeAttribute(n, 'size', attrs.originalSize * 1.4);
        }
      });

      graph.forEachEdge((e, attrs, source, target) => {
        if (source === node || target === node) {
          graph.setEdgeAttribute(e, 'color', 'rgba(255,255,255,0.6)');
        } else {
          graph.setEdgeAttribute(e, 'color', 'rgba(121,134,203,0.04)');
        }
      });

      sigma.refresh();
    });

    sigma.on('leaveNode', () => {
      setHoveredNode(null);
      // Restore all colors
      graph.forEachNode((n, attrs) => {
        graph.setNodeAttribute(n, 'color', attrs.originalColor);
        graph.setNodeAttribute(n, 'size', attrs.originalSize);
      });
      graph.forEachEdge((e, attrs) => {
        graph.setEdgeAttribute(e, 'color', attrs.originalColor);
      });
      sigma.refresh();
    });

    sigma.on('clickNode', ({ node }) => {
      selectNode(node);
    });

    sigma.on('rightClickNode', ({ node, event }) => {
      event.original.preventDefault();
      runWhatIf(node);
    });

    sigma.on('clickStage', () => selectNode(null));

    return () => { sigma.kill(); };
  }, [nodes, edges]);

  // Handle What-If visual overlay
  useEffect(() => {
    if (!graphRef.current || !sigmaRef.current) return;
    const graph = graphRef.current;
    const sigma = sigmaRef.current;

    if (whatIfNode && whatIfResult) {
      const disconnected = new Set(whatIfResult.disconnected_nodes);

      // Animate: hide the removed node
      if (graph.hasNode(whatIfNode)) {
        graph.setNodeAttribute(whatIfNode, 'size', 0.5);
        graph.setNodeAttribute(whatIfNode, 'color', 'rgba(100,100,100,0.2)');
      }

      // Grey out disconnected nodes
      graph.forEachNode((n, attrs) => {
        if (n === whatIfNode) return;
        if (disconnected.has(n)) {
          graph.setNodeAttribute(n, 'color', 'rgba(200,200,200,0.3)');
        }
      });

      // Dim edges from removed node
      graph.forEachEdge((e, attrs, source, target) => {
        if (source === whatIfNode || target === whatIfNode) {
          graph.setEdgeAttribute(e, 'color', 'rgba(200,200,200,0.05)');
        }
      });

      sigma.refresh();
    } else if (!whatIfNode) {
      // Restore all nodes
      graph.forEachNode((n, attrs) => {
        graph.setNodeAttribute(n, 'color', attrs.originalColor);
        graph.setNodeAttribute(n, 'size', attrs.originalSize);
      });
      graph.forEachEdge((e, attrs) => {
        graph.setEdgeAttribute(e, 'color', attrs.originalColor);
      });
      sigma.refresh();
    }
  }, [whatIfNode, whatIfResult]);

  // Critical node pulse animation
  useEffect(() => {
    if (!graphRef.current || !sigmaRef.current || nodes.length === 0) return;
    const graph = graphRef.current;
    const sigma = sigmaRef.current;
    const criticalNodes = nodes.filter(n => n.risk_tier === 'critical').map(n => n.id);
    if (criticalNodes.length === 0) return;

    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.03;
      const scale = 1 + 0.15 * Math.sin(t * Math.PI);
      criticalNodes.forEach(id => {
        if (graph.hasNode(id) && !whatIfNode) {
          const base = graph.getNodeAttribute(id, 'originalSize');
          graph.setNodeAttribute(id, 'size', base * scale);
        }
      });
      sigma.refresh();
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [nodes, whatIfNode]);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px)',
    }}>
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-risk-critical font-display text-3xl mb-2">◈ SYBIL</div>
            <div className="text-text-muted font-mono text-sm">No graph data. Run <span className="text-accent-cyan">make demo</span> to seed.</div>
          </div>
        </div>
      )}
    </div>
  );
}
