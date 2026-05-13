import networkx as nx
import community as community_louvain
import logging
from collections import Counter

logger = logging.getLogger(__name__)


def detect_communities(G: nx.DiGraph) -> dict:
    """
    Louvain Community Detection (Blondel et al. 2008).
    Optimizes modularity Q = Σ_c [ L_c/m - (d_c/2m)² ]
    Works on undirected graphs — converts DiGraph internally.
    Returns: { employee_id: community_integer_id }
    """
    logger.info("Running Louvain community detection")
    G_undirected = G.to_undirected()

    partition = community_louvain.best_partition(G_undirected, weight="weight", random_state=42)

    # Post-processing: label communities by dominant department
    community_members = {}
    for node, comm_id in partition.items():
        if comm_id not in community_members:
            community_members[comm_id] = []
        community_members[comm_id].append(node)

    community_labels = {}
    for comm_id, members in community_members.items():
        departments = [G.nodes[m].get("department", "Unknown") for m in members if m in G.nodes]
        if departments:
            dept_counts = Counter(departments)
            top_depts = dept_counts.most_common(2)
            if len(top_depts) >= 2 and top_depts[1][1] / len(members) > 0.2:
                label = f"{top_depts[0][0]}+{top_depts[1][0]}"
            else:
                label = f"{top_depts[0][0]} Core"
        else:
            label = f"Cluster {comm_id}"

        # Flags
        if len(members) < 3:
            label = f"Isolated: {label}"
        unique_depts = set(departments)
        if len(unique_depts) > 3:
            label = f"Bridge: {label}"

        community_labels[comm_id] = label

    num_communities = len(community_members)
    logger.info(f"Detected {num_communities} communities")
    for comm_id, members in sorted(community_members.items(), key=lambda x: -len(x[1]))[:5]:
        logger.info(f"  Community {comm_id} ({community_labels[comm_id]}): {len(members)} members")

    return partition, community_labels


def find_structural_holes(G: nx.DiGraph) -> dict:
    """
    Structural Holes (Burt 1992): nodes bridging disconnected communities.
    Computes effective size and constraint for each node.
    High effective size + low constraint = structural hole spanner = SPOF.
    """
    logger.info("Computing structural holes")
    G_undirected = G.to_undirected()
    scores = {}

    for node in G_undirected.nodes():
        neighbors = list(G_undirected.neighbors(node))
        if len(neighbors) < 2:
            scores[node] = 0.0
            continue

        # Effective size: degree minus redundancy among neighbors
        redundancy = 0
        for i, ni in enumerate(neighbors):
            for nj in neighbors[i + 1:]:
                if G_undirected.has_edge(ni, nj):
                    redundancy += 1

        max_possible = len(neighbors) * (len(neighbors) - 1) / 2
        if max_possible > 0:
            effective_size = len(neighbors) * (1 - redundancy / max_possible)
        else:
            effective_size = float(len(neighbors))

        # Normalize to 0-1
        scores[node] = min(effective_size / max(len(neighbors), 1), 1.0)

    logger.info(f"Structural holes computed. Max score: {max(scores.values()):.4f}")
    return scores
