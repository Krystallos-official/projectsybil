from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
import time
import logging

from config import settings
from neo4j_client import Neo4jClient
from graph_builder import build_networkx_graph
from algorithms.centrality import compute_betweenness_centrality, compute_pagerank, compute_degree_centrality
from algorithms.community import detect_communities, find_structural_holes
from algorithms.redundancy import compute_redundancy
from algorithms.fragility import compute_fragility_score
from algorithms.temporal import compute_temporal_fragility
from algorithms.whatif import simulate_node_removal

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("sybil-analysis")

app = FastAPI(title="Sybil Analysis Engine", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

client = Neo4jClient()

# Cache the graph between requests for what-if queries
_cached_graph = None
_cache_time = 0


def get_graph():
    global _cached_graph, _cache_time
    if _cached_graph is None or (time.time() - _cache_time) > 300:
        _cached_graph = build_networkx_graph(client)
        _cache_time = time.time()
    return _cached_graph


@app.post("/run")
async def run_analysis():
    """Full analysis pipeline."""
    start = time.time()
    snapshot_id = str(uuid.uuid4())

    logger.info("Starting full analysis pipeline")

    # 1. Build graph
    G = build_networkx_graph(client)
    global _cached_graph, _cache_time
    _cached_graph = G
    _cache_time = time.time()

    if G.number_of_nodes() == 0:
        raise HTTPException(400, "No employee nodes found. Seed data first.")

    # 2. Centrality metrics
    betweenness = compute_betweenness_centrality(G)
    pagerank = compute_pagerank(G)
    degree = compute_degree_centrality(G)

    # 3. Community detection
    partition, community_labels = detect_communities(G)

    # 4. Structural holes
    structural_holes = find_structural_holes(G)

    # 5. Per-employee analysis
    scores = []
    for node_id in G.nodes():
        # Redundancy (expensive — sample for large graphs)
        redundancy = compute_redundancy(G, node_id)

        # Bus factor average for owned repos
        repos = client.get_employee_repos(node_id)
        bus_factors = [r.get("bus_factor", 3) or 3 for r in repos]
        bus_factor_avg = sum(bus_factors) / len(bus_factors) if bus_factors else 3.0

        # Composite fragility
        bc_val = betweenness.get(node_id, 0)
        pr_val = pagerank.get(node_id, 0)

        # Normalize pagerank to 0-1 range
        pr_max = max(pagerank.values()) if pagerank else 1
        pr_normalized = pr_val / pr_max if pr_max > 0 else 0

        fragility, risk_tier = compute_fragility_score(
            betweenness=bc_val,
            pagerank=pr_normalized,
            redundancy=redundancy,
            degree_centrality=degree.get(node_id, 0),
            structural_hole_score=structural_holes.get(node_id, 0),
            bus_factor_avg=bus_factor_avg,
        )

        comm_id = partition.get(node_id, 0)
        scores.append({
            "id": node_id,
            "betweenness": round(bc_val, 6),
            "pagerank": round(pr_normalized, 6),
            "degree": round(degree.get(node_id, 0), 6),
            "redundancy": round(redundancy, 4),
            "fragility": fragility,
            "risk_tier": risk_tier,
            "community_id": comm_id,
            "community_label": community_labels.get(comm_id, f"Cluster {comm_id}"),
        })

    # 6. Write scores to Neo4j
    client.write_employee_scores(scores, snapshot_id)

    # 7. Create snapshot
    critical = sum(1 for s in scores if s["risk_tier"] == "critical")
    high = sum(1 for s in scores if s["risk_tier"] == "high")
    avg_frag = sum(s["fragility"] for s in scores) / len(scores) if scores else 0
    top_spof = max(scores, key=lambda s: s["fragility"]) if scores else {"id": "none"}

    client.create_snapshot(snapshot_id, {
        "employee_count": len(scores),
        "critical_spofs": critical,
        "high_risk_nodes": high,
        "avg_fragility": round(avg_frag, 2),
        "top_spof_id": top_spof["id"],
    })

    duration = round(time.time() - start, 2)
    logger.info(f"Analysis complete in {duration}s — {critical} critical, {high} high risk")

    return {
        "snapshot_id": snapshot_id,
        "employee_count": len(scores),
        "critical_spofs": critical,
        "high_risk_nodes": high,
        "avg_fragility": round(avg_frag, 2),
        "top_spof": top_spof,
        "duration_seconds": duration,
    }


@app.get("/whatif/{node_id}")
async def whatif(node_id: str):
    G = get_graph()
    result = simulate_node_removal(G, node_id, neo4j_client=client)
    return result


@app.get("/temporal/{node_id}")
async def temporal(node_id: str):
    return compute_temporal_fragility(node_id, client)


@app.get("/health")
async def health():
    neo4j_ok = client.verify_connectivity()
    return {"status": "ok" if neo4j_ok else "degraded", "neo4j": neo4j_ok}
