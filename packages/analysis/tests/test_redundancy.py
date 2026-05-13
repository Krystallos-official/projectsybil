import networkx as nx
import pytest
from algorithms.redundancy import compute_redundancy, compute_bus_factor


class TestRedundancy:
    def test_bridge_node_low_redundancy(self):
        """A node bridging two clusters should have low redundancy."""
        G = nx.DiGraph()
        # Cluster 1
        for i in range(4):
            for j in range(i + 1, 4):
                G.add_edge(f"a{i}", f"a{j}", weight=1)
                G.add_edge(f"a{j}", f"a{i}", weight=1)
        # Cluster 2
        for i in range(4):
            for j in range(i + 1, 4):
                G.add_edge(f"b{i}", f"b{j}", weight=1)
                G.add_edge(f"b{j}", f"b{i}", weight=1)
        # Bridge
        G.add_edge("a0", "bridge", weight=1)
        G.add_edge("bridge", "b0", weight=1)

        redundancy = compute_redundancy(G, "bridge")
        assert redundancy < 0.8  # Low redundancy = important

    def test_leaf_node_high_redundancy(self):
        """A leaf node should have high redundancy (removing it doesn't matter)."""
        G = nx.DiGraph()
        for i in range(5):
            for j in range(i + 1, 5):
                G.add_edge(f"n{i}", f"n{j}", weight=1)
                G.add_edge(f"n{j}", f"n{i}", weight=1)
        G.add_edge("n0", "leaf", weight=1)

        redundancy = compute_redundancy(G, "leaf")
        assert redundancy >= 0.9  # High redundancy = not important


class TestBusFactor:
    def test_single_contributor(self):
        assert compute_bus_factor({"alice": 100}) == 1

    def test_equal_contributors(self):
        result = compute_bus_factor({"alice": 50, "bob": 50})
        assert result == 1  # Only need 1 to reach >50%

    def test_three_contributors(self):
        result = compute_bus_factor({"alice": 40, "bob": 35, "charlie": 25})
        assert result == 2  # Need alice+bob to exceed 50%

    def test_empty(self):
        assert compute_bus_factor({}) == 0
