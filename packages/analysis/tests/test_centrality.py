import networkx as nx
import pytest
from algorithms.centrality import compute_betweenness_centrality, compute_pagerank, compute_degree_centrality


def make_star_graph():
    """Star graph: center node connected to 5 leaves. Center should have highest centrality."""
    G = nx.DiGraph()
    for i in range(5):
        G.add_edge("center", f"leaf_{i}", weight=1)
        G.add_edge(f"leaf_{i}", "center", weight=1)
    return G


def make_chain_graph():
    """Chain: A → B → C → D → E. B,C,D should have highest betweenness."""
    G = nx.DiGraph()
    for a, b in [("A", "B"), ("B", "C"), ("C", "D"), ("D", "E")]:
        G.add_edge(a, b, weight=1)
    return G


class TestBetweennessCentrality:
    def test_star_center_highest(self):
        G = make_star_graph()
        bc = compute_betweenness_centrality(G)
        assert bc["center"] == max(bc.values())

    def test_chain_middle_highest(self):
        G = make_chain_graph()
        bc = compute_betweenness_centrality(G)
        # Middle nodes should have higher betweenness than endpoints
        assert bc["C"] > bc["A"]
        assert bc["C"] > bc["E"]

    def test_values_normalized(self):
        G = make_star_graph()
        bc = compute_betweenness_centrality(G)
        for v in bc.values():
            assert 0 <= v <= 1


class TestPageRank:
    def test_returns_all_nodes(self):
        G = make_star_graph()
        pr = compute_pagerank(G)
        assert len(pr) == G.number_of_nodes()

    def test_values_sum_to_one(self):
        G = make_star_graph()
        pr = compute_pagerank(G)
        assert abs(sum(pr.values()) - 1.0) < 0.01

    def test_center_highest_in_star(self):
        G = make_star_graph()
        pr = compute_pagerank(G)
        assert pr["center"] == max(pr.values())


class TestDegreeCentrality:
    def test_center_highest(self):
        G = make_star_graph()
        dc = compute_degree_centrality(G)
        assert dc["center"] == max(dc.values())
