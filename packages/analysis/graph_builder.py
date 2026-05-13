import networkx as nx
from neo4j_client import Neo4jClient
import logging

logger = logging.getLogger(__name__)


def build_networkx_graph(client: Neo4jClient) -> nx.DiGraph:
    """
    Pulls all Employee nodes and relationships from Neo4j.
    Builds a weighted directed graph where:
      - Nodes = employees (id as node identifier)
      - Node attributes: department, role, name
      - Edges = all relationship types with combined weights

    For composite weight (multiple relationship types between same pair),
    sum all weights.
    """
    G = nx.DiGraph()

    # Fetch all employees
    employees = client.get_all_employees()
    for emp in employees:
        G.add_node(
            emp["id"],
            name=emp.get("name", emp["id"]),
            department=emp.get("department", "Unknown"),
            role=emp.get("role", "Unknown"),
        )

    logger.info(f"Added {G.number_of_nodes()} employee nodes")

    # Fetch all employee-to-employee relationships
    relationships = client.get_employee_relationships()

    # Accumulate weights between same node pairs
    edge_weights = {}
    for rel in relationships:
        source = rel["source"]
        target = rel["target"]
        weight = rel.get("weight", 1)
        rel_type = rel.get("rel_type", "UNKNOWN")

        if source not in G.nodes or target not in G.nodes:
            continue

        key = (source, target)
        if key not in edge_weights:
            edge_weights[key] = {"weight": 0, "rel_types": set()}
        edge_weights[key]["weight"] += weight
        edge_weights[key]["rel_types"].add(rel_type)

    # Add combined edges
    for (source, target), data in edge_weights.items():
        G.add_edge(
            source, target,
            weight=data["weight"],
            rel_types=list(data["rel_types"]),
        )

    logger.info(f"Added {G.number_of_edges()} edges (combined from {len(relationships)} relationships)")

    return G
