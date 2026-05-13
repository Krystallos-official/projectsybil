import networkx as nx
import logging

logger = logging.getLogger(__name__)


def compute_betweenness_centrality(G: nx.DiGraph) -> dict:
    """
    Betweenness Centrality: C_B(v) = Σ_{s≠v≠t} [ σ_st(v) / σ_st ]
    Uses Brandes algorithm. For graphs > 500 nodes, use approximate
    computation with k=min(500, n) for <5% error.
    """
    n = G.number_of_nodes()
    k = min(500, n) if n > 500 else None

    logger.info(f"Computing betweenness centrality (n={n}, k={k})")
    bc = nx.betweenness_centrality(G, normalized=True, weight="weight", k=k)
    logger.info(f"Betweenness centrality computed. Max: {max(bc.values()):.4f}")
    return bc


def compute_pagerank(G: nx.DiGraph) -> dict:
    """
    PageRank — identifies authoritative knowledge nodes.
    High PageRank = depended-on by other critical employees.
    """
    logger.info("Computing PageRank")
    try:
        pr = nx.pagerank(G, alpha=0.85, weight="weight", max_iter=200)
    except nx.PowerIterationFailedConvergence:
        logger.warning("PageRank did not converge, using default values")
        pr = {node: 1.0 / G.number_of_nodes() for node in G.nodes()}
    logger.info(f"PageRank computed. Max: {max(pr.values()):.6f}")
    return pr


def compute_degree_centrality(G: nx.DiGraph) -> dict:
    """
    Simple ratio of connections to max possible.
    """
    logger.info("Computing degree centrality")
    dc = nx.degree_centrality(G)
    logger.info(f"Degree centrality computed. Max: {max(dc.values()):.4f}")
    return dc
