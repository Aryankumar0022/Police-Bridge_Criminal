from app.repositories.neo4j_connector import neo4j_connector
import logging
import networkx as nx

logger = logging.getLogger(__name__)

def get_networkx_graph():
    query = """
    MATCH (n)-[r]->(m)
    RETURN id(n) AS source_id, labels(n)[0] AS source_label, 
           coalesce(n.name, n.person_name, n.phone_number, n.registration_number, n.account_number, n.subscriber_name) AS source_name,
           id(m) AS target_id, labels(m)[0] AS target_label, 
           coalesce(m.name, m.person_name, m.phone_number, m.registration_number, m.account_number, m.subscriber_name) AS target_name
    """
    results = neo4j_connector.run_query(query)
    G = nx.Graph()  # Using undirected for some algorithms, or directed? PageRank usually directed, others undirected
    
    # We will build a DiGraph
    DiG = nx.DiGraph()
    
    for record in results:
        # Fallback names if none of the specific fields exist
        s_name = record['source_name'] or f"{record['source_label']}_{record['source_id']}"
        t_name = record['target_name'] or f"{record['target_label']}_{record['target_id']}"
        
        DiG.add_node(s_name)
        DiG.add_node(t_name)
        DiG.add_edge(s_name, t_name)
        
    return DiG

def run_pagerank():
    """
    Run PageRank algorithm on the graph using NetworkX.
    """
    logger.info("Running PageRank via NetworkX...")
    try:
        G = get_networkx_graph()
        pr = nx.pagerank(G)
        
        # Sort and get top 20
        sorted_pr = sorted(pr.items(), key=lambda x: x[1], reverse=True)[:20]
        results = [{"name": node, "score": score} for node, score in sorted_pr]
        
        logger.info(f"PageRank completed. Top 20 scores computed.")
        return results
    except Exception as e:
        logger.error(f"Failed to run PageRank: {e}")
        return []

def run_betweenness_centrality():
    """
    Run Betweenness Centrality algorithm on the graph using NetworkX.
    """
    logger.info("Running Betweenness Centrality via NetworkX...")
    try:
        G = get_networkx_graph()
        bc = nx.betweenness_centrality(G)
        
        sorted_bc = sorted(bc.items(), key=lambda x: x[1], reverse=True)[:20]
        results = [{"name": node, "score": score} for node, score in sorted_bc]
        
        logger.info(f"Betweenness Centrality completed.")
        return results
    except Exception as e:
        logger.error(f"Failed to run Betweenness Centrality: {e}")
        return []

def run_pagerank_and_betweenness():
    """
    Run both PageRank and Betweenness Centrality and return the results.
    """
    pagerank_results = run_pagerank()
    betweenness_results = run_betweenness_centrality()
    return {
        "pagerank": pagerank_results,
        "betweenness": betweenness_results
    }

def run_community_detection():
    """
    Run community detection (Louvain) on the graph using NetworkX / community library.
    """
    logger.info("Running Community Detection (Louvain) via NetworkX...")
    try:
        G = get_networkx_graph()
        # NetworkX has a built-in louvain communities starting from version 2.7+
        # It returns a list of sets, where each set is a community of nodes
        communities = nx.community.louvain_communities(G.to_undirected())
        
        results = []
        for comm_id, node_set in enumerate(communities):
            for node in node_set:
                results.append({"name": node, "communityId": comm_id})
                
        # Sort by communityId
        results = sorted(results, key=lambda x: (x["communityId"], x["name"]))
        logger.info(f"Community Detection completed. Found {len(results)} node assignments.")
        return results
    except Exception as e:
        logger.error(f"Failed to run Community Detection: {e}")
        return []

def run_degree_centrality():
    """
    Run Degree Centrality algorithm on the graph using NetworkX.
    """
    logger.info("Running Degree Centrality via NetworkX...")
    try:
        G = get_networkx_graph()
        dc = nx.degree_centrality(G)
        
        sorted_dc = sorted(dc.items(), key=lambda x: x[1], reverse=True)[:20]
        results = [{"name": node, "score": score} for node, score in sorted_dc]
        
        logger.info(f"Degree Centrality completed.")
        return results
    except Exception as e:
        logger.error(f"Failed to run Degree Centrality: {e}")
        return []