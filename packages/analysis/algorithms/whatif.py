import networkx as nx
import logging

logger = logging.getLogger(__name__)


def simulate_node_removal(
    G: nx.DiGraph,
    node_id: str,
    neo4j_client=None,
) -> dict:
    """
    What-If simulation: what happens if this node disappears?
    """
    if node_id not in G.nodes:
        return {
            "removed_node": node_id,
            "disconnected_nodes": [],
            "severed_paths": 0,
            "affected_projects": [],
            "orphaned_repos": [],
            "impact_score": 0.0,
            "interpretation": f"Node {node_id} not found in graph.",
        }

    node_data = G.nodes[node_id]
    node_name = node_data.get("name", node_id)

    # Connected nodes before removal
    connected_before = set(G.successors(node_id)) | set(G.predecessors(node_id))

    # Get betweenness for impact calculation
    n = G.number_of_nodes()
    k = min(200, n) if n > 200 else None
    bc = nx.betweenness_centrality(G, normalized=True, weight="weight", k=k)
    betweenness = bc.get(node_id, 0)

    # Remove node
    G_minus = G.copy()
    G_minus.remove_node(node_id)

    # Find disconnected nodes: nodes in connected_before that are now
    # in a different weakly connected component than the largest
    wcc_before = max(nx.weakly_connected_components(G), key=len)
    wcc_after = list(nx.weakly_connected_components(G_minus))
    largest_after = max(wcc_after, key=len) if wcc_after else set()

    disconnected_nodes = []
    for node in connected_before:
        if node in G_minus.nodes and node not in largest_after:
            disconnected_nodes.append(node)

    # Count severed paths (approximation from betweenness)
    severed_paths = int(betweenness * n * (n - 1))

    # Get affected projects and orphaned repos from Neo4j
    affected_projects = []
    orphaned_repos = []
    if neo4j_client:
        projects = neo4j_client.get_employee_projects(node_id)
        affected_projects = [p["name"] for p in projects]

        repos = neo4j_client.get_employee_repos(node_id)
        orphaned_repos = [r["url"] for r in repos if r.get("bus_factor", 999) <= 1]

    # Compute redundancy inline
    total_pairs = 0
    disconnected_pairs = 0
    neighborhood = list(connected_before)[:50]
    for i in range(len(neighborhood)):
        for j in range(i + 1, len(neighborhood)):
            u, v = neighborhood[i], neighborhood[j]
            total_pairs += 1
            try:
                nx.shortest_path(G, u, v)
            except nx.NetworkXNoPath:
                continue
            try:
                nx.shortest_path(G_minus, u, v)
            except nx.NetworkXNoPath:
                disconnected_pairs += 1

    redundancy = 1.0 - (disconnected_pairs / max(total_pairs, 1))

    # Impact score
    impact_score = (
        (len(disconnected_nodes) / max(n, 1)) * 50 +
        betweenness * 30 +
        (1 - redundancy) * 20
    )
    impact_score = max(0, min(100, impact_score))

    # Interpretation
    parts = []
    if len(disconnected_nodes) > 0:
        parts.append(f"{len(disconnected_nodes)} employees lose their direct connection to the main organization graph.")
    if orphaned_repos:
        parts.append(f"{len(orphaned_repos)} repositories have no designated owner.")
    if affected_projects:
        parts.append(f"{len(affected_projects)} active projects lose {'their' if len(affected_projects) > 1 else 'a'} key contributor.")
    if severed_paths > 0:
        parts.append(f"{severed_paths} communication paths are severed.")

    interpretation = " ".join(parts) if parts else f"Removing {node_name} has minimal impact on the organization graph."

    return {
        "removed_node": node_id,
        "removed_node_name": node_name,
        "disconnected_nodes": disconnected_nodes,
        "disconnected_count": len(disconnected_nodes),
        "severed_paths": severed_paths,
        "affected_projects": affected_projects,
        "orphaned_repos": orphaned_repos,
        "impact_score": round(impact_score, 1),
        "interpretation": interpretation,
    }
