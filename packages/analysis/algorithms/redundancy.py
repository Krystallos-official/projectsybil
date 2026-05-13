import networkx as nx
import random
import logging

logger = logging.getLogger(__name__)


def compute_redundancy(G: nx.DiGraph, node: str) -> float:
    """
    How much does removing this node damage connectivity?
    0 = catastrophic (no alternative paths), 1 = fully redundant.
    """
    if node not in G.nodes:
        return 1.0

    # Get 2-hop neighborhood
    neighbors_1 = set(G.successors(node)) | set(G.predecessors(node))
    neighbors_2 = set()
    for n in neighbors_1:
        neighbors_2 |= set(G.successors(n)) | set(G.predecessors(n))
    neighborhood = (neighbors_1 | neighbors_2) - {node}

    if len(neighborhood) < 2:
        return 1.0

    # Sample pairs if neighborhood is large
    pairs = list(neighborhood)
    if len(pairs) > 50:
        pairs = random.sample(pairs, 50)

    total_pairs = 0
    disconnected_pairs = 0

    G_minus = G.copy()
    G_minus.remove_node(node)

    for i in range(len(pairs)):
        for j in range(i + 1, len(pairs)):
            u, v = pairs[i], pairs[j]
            total_pairs += 1

            # Check if path existed in original graph
            try:
                nx.shortest_path(G, u, v)
                had_path = True
            except nx.NetworkXNoPath:
                had_path = False

            if not had_path:
                continue

            # Check if path still exists without the node
            try:
                nx.shortest_path(G_minus, u, v)
            except nx.NetworkXNoPath:
                disconnected_pairs += 1

    if total_pairs == 0:
        return 1.0

    redundancy = 1.0 - (disconnected_pairs / total_pairs)
    return round(redundancy, 4)


def compute_bus_factor(commit_weights: dict) -> int:
    """
    Bus Factor: minimum contributors representing >50% of commits.
    bus_factor = 1: Critical
    bus_factor = 2: High risk
    bus_factor >= 3: Acceptable
    """
    if not commit_weights:
        return 0

    sorted_authors = sorted(commit_weights.items(), key=lambda x: -x[1])
    total = sum(commit_weights.values())
    if total == 0:
        return 0

    cumulative = 0
    bus_factor = 0
    for _, count in sorted_authors:
        cumulative += count
        bus_factor += 1
        if cumulative > total * 0.5:
            break

    return bus_factor
