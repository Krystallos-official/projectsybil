import logging

logger = logging.getLogger(__name__)


def compute_fragility_score(
    betweenness: float,
    pagerank: float,
    redundancy: float,
    degree_centrality: float,
    structural_hole_score: float,
    bus_factor_avg: float,
) -> tuple:
    """
    Composite Fragility Score — the main output of Sybil.

    Weighted formula:
      fragility = (
        0.30 * betweenness_centrality +
        0.20 * pagerank_score +
        0.20 * (1 - redundancy_score) +
        0.15 * degree_centrality +
        0.10 * structural_hole_score +
        0.05 * (1 / max(bus_factor_avg, 1))
      )

    Normalized: multiply raw by 100, clamp to 0-100.

    Risk Tiers:
      85-100: "critical"
      65-84:  "high"
      40-64:  "medium"
      0-39:   "low"
    """
    raw = (
        0.30 * betweenness +
        0.20 * pagerank +
        0.20 * (1.0 - redundancy) +
        0.15 * degree_centrality +
        0.10 * structural_hole_score +
        0.05 * (1.0 / max(bus_factor_avg, 1.0))
    )

    score = max(0.0, min(100.0, raw * 100.0))

    if score >= 85:
        tier = "critical"
    elif score >= 65:
        tier = "high"
    elif score >= 40:
        tier = "medium"
    else:
        tier = "low"

    return round(score, 2), tier
