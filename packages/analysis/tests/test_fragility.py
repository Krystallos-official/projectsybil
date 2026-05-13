import pytest
from algorithms.fragility import compute_fragility_score


class TestFragilityScore:
    def test_critical_tier(self):
        score, tier = compute_fragility_score(
            betweenness=0.95, pagerank=0.9, redundancy=0.1,
            degree_centrality=0.8, structural_hole_score=0.7, bus_factor_avg=1.0,
        )
        assert tier == "critical"
        assert score >= 85

    def test_low_tier(self):
        score, tier = compute_fragility_score(
            betweenness=0.05, pagerank=0.05, redundancy=0.9,
            degree_centrality=0.1, structural_hole_score=0.05, bus_factor_avg=5.0,
        )
        assert tier == "low"
        assert score < 40

    def test_score_range(self):
        score, _ = compute_fragility_score(0.5, 0.5, 0.5, 0.5, 0.5, 2.0)
        assert 0 <= score <= 100

    def test_zero_inputs(self):
        score, tier = compute_fragility_score(0, 0, 1.0, 0, 0, 10.0)
        assert tier == "low"
        assert score < 10

    def test_bus_factor_one_increases_score(self):
        score1, _ = compute_fragility_score(0.5, 0.5, 0.5, 0.5, 0.5, 1.0)
        score5, _ = compute_fragility_score(0.5, 0.5, 0.5, 0.5, 0.5, 5.0)
        assert score1 > score5  # bus_factor=1 should increase fragility
