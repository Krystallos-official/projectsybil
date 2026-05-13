import logging
import numpy as np

logger = logging.getLogger(__name__)


def compute_temporal_fragility(
    employee_id: str,
    neo4j_client,
    lookback_snapshots: int = 12,
) -> dict:
    """
    Computes trend in fragility score over time for a specific employee.
    """
    scores_data = neo4j_client.run_query("""
        MATCH (e:Employee {id: $id})-[r:SNAPSHOT_SCORE]->(s:AnalysisSnapshot)
        RETURN s.created_at AS date, r.fragility_score AS fragility,
               r.betweenness AS betweenness, r.risk_tier AS risk_tier
        ORDER BY s.created_at DESC
        LIMIT $limit
    """, {"id": employee_id, "limit": lookback_snapshots})

    if not scores_data:
        return {
            "scores": [],
            "trend_direction": "stable",
            "trend_magnitude": 0.0,
            "peak_score": 0.0,
            "peak_date": None,
            "is_accelerating": False,
        }

    scores = [s.get("fragility", 0) or 0 for s in scores_data]
    dates = [str(s.get("date", "")) for s in scores_data]

    # Reverse to chronological order
    scores = list(reversed(scores))
    dates = list(reversed(dates))

    # Trend direction
    if len(scores) >= 2:
        first_half = np.mean(scores[: len(scores) // 2])
        second_half = np.mean(scores[len(scores) // 2 :])
        diff = second_half - first_half

        if diff > 5:
            trend_direction = "increasing"
        elif diff < -5:
            trend_direction = "decreasing"
        else:
            trend_direction = "stable"

        trend_magnitude = round(abs(diff) / max(first_half, 1) * 100, 2)
    else:
        trend_direction = "stable"
        trend_magnitude = 0.0

    # Peak
    peak_idx = int(np.argmax(scores))
    peak_score = scores[peak_idx]
    peak_date = dates[peak_idx] if peak_idx < len(dates) else None

    # Acceleration (second derivative > 0)
    is_accelerating = False
    if len(scores) >= 3:
        diffs = np.diff(scores)
        second_diffs = np.diff(diffs)
        is_accelerating = bool(np.mean(second_diffs) > 0)

    return {
        "scores": [{"date": d, "fragility": s} for d, s in zip(dates, scores)],
        "trend_direction": trend_direction,
        "trend_magnitude": trend_magnitude,
        "peak_score": round(peak_score, 2),
        "peak_date": peak_date,
        "is_accelerating": is_accelerating,
    }
