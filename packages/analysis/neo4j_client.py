from neo4j import GraphDatabase
from config import settings
import logging

logger = logging.getLogger(__name__)


class Neo4jClient:
    def __init__(self):
        self._driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
        logger.info(f"Neo4j client initialized: {settings.NEO4J_URI}")

    def close(self):
        self._driver.close()

    def verify_connectivity(self) -> bool:
        try:
            self._driver.verify_connectivity()
            return True
        except Exception as e:
            logger.error(f"Neo4j connectivity check failed: {e}")
            return False

    def run_query(self, cypher: str, params: dict = None) -> list:
        with self._driver.session() as session:
            result = session.run(cypher, params or {})
            return [dict(record) for record in result]

    def write_query(self, cypher: str, params: dict = None):
        with self._driver.session() as session:
            session.execute_write(lambda tx: tx.run(cypher, params or {}))

    def get_all_employees(self) -> list:
        return self.run_query("""
            MATCH (e:Employee)
            RETURN e.id AS id, e.name AS name, e.department AS department,
                   e.role AS role, e.fragility_score AS fragility_score,
                   e.risk_tier AS risk_tier
        """)

    def get_employee_relationships(self) -> list:
        return self.run_query("""
            MATCH (a:Employee)-[r]->(b:Employee)
            WHERE type(r) IN ['COLLABORATES_WITH', 'REVIEWS', 'MESSAGES', 'BLOCKS']
            RETURN a.id AS source, b.id AS target,
                   type(r) AS rel_type, COALESCE(r.weight, 1) AS weight
        """)

    def write_employee_scores(self, scores: list, snapshot_id: str):
        for score in scores:
            self.write_query("""
                MATCH (e:Employee {id: $id})
                SET e.betweenness_centrality = $betweenness,
                    e.pagerank_score = $pagerank,
                    e.degree_centrality = $degree,
                    e.redundancy_score = $redundancy,
                    e.fragility_score = $fragility,
                    e.risk_tier = $risk_tier,
                    e.community_id = $community_id,
                    e.community_label = $community_label,
                    e.last_analyzed = datetime()
                WITH e
                MERGE (s:AnalysisSnapshot {id: $snapshot_id})
                MERGE (e)-[r:SNAPSHOT_SCORE]->(s)
                SET r.fragility_score = $fragility,
                    r.betweenness = $betweenness,
                    r.risk_tier = $risk_tier
            """, {
                "id": score["id"],
                "betweenness": score["betweenness"],
                "pagerank": score["pagerank"],
                "degree": score["degree"],
                "redundancy": score["redundancy"],
                "fragility": score["fragility"],
                "risk_tier": score["risk_tier"],
                "community_id": score["community_id"],
                "community_label": score["community_label"],
                "snapshot_id": snapshot_id,
            })

    def create_snapshot(self, snapshot_id: str, stats: dict):
        self.write_query("""
            MERGE (s:AnalysisSnapshot {id: $id})
            SET s.created_at = datetime(),
                s.employee_count = $employee_count,
                s.critical_spofs = $critical_spofs,
                s.high_risk_nodes = $high_risk_nodes,
                s.avg_fragility = $avg_fragility,
                s.top_spof_id = $top_spof_id
        """, {"id": snapshot_id, **stats})

    def get_employee_repos(self, employee_id: str) -> list:
        return self.run_query("""
            MATCH (e:Employee {id: $id})-[:COMMITS_TO|OWNS]->(r:Repository)
            RETURN r.url AS url, r.bus_factor AS bus_factor
        """, {"id": employee_id})

    def get_employee_projects(self, employee_id: str) -> list:
        return self.run_query("""
            MATCH (e:Employee {id: $id})-[:ASSIGNED_TO|OWNS]->(p:Project)
            RETURN p.name AS name
        """, {"id": employee_id})
