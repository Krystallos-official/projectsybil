"""Sybil Analysis Engine — CLI entry point."""
import argparse
import sys
import logging

from neo4j_client import Neo4jClient
from graph_builder import build_networkx_graph
from algorithms import (
    compute_betweenness_centrality, compute_pagerank,
    compute_degree_centrality, detect_communities,
    find_structural_holes, compute_redundancy,
    compute_fragility_score, simulate_node_removal,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("sybil-cli")


def main():
    parser = argparse.ArgumentParser(description="Sybil Analysis Engine CLI")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("run", help="Run full analysis pipeline")
    whatif_parser = sub.add_parser("whatif", help="Simulate node removal")
    whatif_parser.add_argument("node_id", help="Employee ID to simulate removing")
    sub.add_parser("stats", help="Show graph statistics")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    client = Neo4jClient()

    if args.command == "stats":
        G = build_networkx_graph(client)
        print(f"Nodes: {G.number_of_nodes()}")
        print(f"Edges: {G.number_of_edges()}")
        print(f"Density: {G.number_of_edges() / max(G.number_of_nodes() ** 2, 1):.6f}")
        bc = compute_betweenness_centrality(G)
        top5 = sorted(bc.items(), key=lambda x: -x[1])[:5]
        print("\nTop 5 by betweenness centrality:")
        for node_id, score in top5:
            name = G.nodes[node_id].get("name", node_id)
            print(f"  {name}: {score:.4f}")

    elif args.command == "whatif":
        G = build_networkx_graph(client)
        result = simulate_node_removal(G, args.node_id, client)
        print(f"\n{'='*50}")
        print(f"WHAT-IF: Removing {result['removed_node_name']}")
        print(f"{'='*50}")
        print(f"Impact Score:      {result['impact_score']}")
        print(f"Disconnected:      {result['disconnected_count']} nodes")
        print(f"Severed Paths:     {result['severed_paths']}")
        print(f"Affected Projects: {len(result['affected_projects'])}")
        print(f"Orphaned Repos:    {len(result['orphaned_repos'])}")
        print(f"\n{result['interpretation']}")

    elif args.command == "run":
        import uvicorn
        # Trigger the /run endpoint logic directly
        from api import run_analysis
        import asyncio
        result = asyncio.run(run_analysis())
        print(f"\nAnalysis complete:")
        print(f"  Snapshot: {result['snapshot_id']}")
        print(f"  Employees: {result['employee_count']}")
        print(f"  Critical: {result['critical_spofs']}")
        print(f"  High Risk: {result['high_risk_nodes']}")
        print(f"  Avg Fragility: {result['avg_fragility']}")

    client.close()


if __name__ == "__main__":
    main()
