# PoliceBridge — AI-Powered Criminal Network Analysis System

### Google Developer Groups on Campus  
### Netaji Subhas University of Technology (NSUT)  
### Devlympics – Shunya 2026  
### Theme: Bridge the Gap

---

## 1. The Problem: Bridging the Gap Between Police and Criminal Intelligence

Criminal investigations often involve information scattered across multiple sources, including FIRs, criminal records, call detail records (CDRs), financial transactions, vehicle registrations, emails, social media records, and witness statements.

Each source provides only a partial view of an investigation. A phone number may appear in a call record, a vehicle may be mentioned in an FIR, and a financial transaction may connect two accounts. However, these pieces of information are often stored in different formats and systems, making it difficult for investigators to identify meaningful connections across them.

**The gap is not simply between the police and criminals. It is between law enforcement investigators and the fragmented intelligence they need to understand criminal networks.**

When information remains disconnected, relationships can be difficult to discover, evidence can take longer to correlate, and investigators may lack a unified view of how people, organizations, locations, vehicles, and financial activities are connected.

## 2. Our Interpretation of "Bridge the Gap"

PoliceBridge addresses the gap between **fragmented criminal intelligence and actionable investigative understanding**.

Our system acts as an intelligent bridge that brings information from different sources into a unified, interconnected knowledge graph. It helps investigators move beyond isolated records and explore relationships across multiple datasets.

Instead of requiring investigators to manually connect information scattered across documents and databases, PoliceBridge extracts entities, identifies potential relationships, resolves duplicate records, and presents the resulting connections in a structured graph.

The goal is to make complex investigative information easier to navigate, understand, and examine.

## 3. Our Solution: PoliceBridge

PoliceBridge is an AI-powered criminal network analysis system that ingests structured, semi-structured, and unstructured data, extracts entities and relationships, and builds a provenance-aware knowledge graph using Neo4j.

It connects information about people, phone numbers, vehicles, bank accounts, organizations, locations, documents, and criminal cases.

Investigators can use the system to search for entities, explore their connections, identify possible network hubs, trace paths between entities, and examine the source records supporting each relationship.

**PoliceBridge bridges the gap between isolated data points and a connected view of investigative intelligence.**

The system supports human-led investigation. A detected relationship is an investigative lead, not proof of criminal activity or guilt.

---

## 4. How PoliceBridge Works

The system follows a multi-stage intelligence-processing pipeline.

```text
Multiple Data Sources
        |
        v
Data Ingestion
        |
        v
Entity Extraction
        |
        v
Relationship Extraction
        |
        v
Entity Resolution
        |
        v
Neo4j Knowledge Graph
        |
        v
Graph Analytics and Investigation APIs
        |
        v
Connected Intelligence for Investigators
```

### Step 1: Data Ingestion

The system processes information from multiple sources:

- Structured data: CSV files containing registries, transactions, and records.
- Semi-structured data: JSON records containing calls, cases, and other events.
- Unstructured data: FIR narratives, reports, emails, and text documents.

Each ingestion service converts source records into a consistent internal representation.

### Step 2: Entity Extraction

The NLP pipeline identifies relevant entities, including:

- Persons
- Phone numbers
- Vehicle registration numbers
- Bank accounts
- Locations and addresses
- Organizations
- Cases and documents

This transforms raw records into identifiable entities that can be linked across sources.

### Step 3: Relationship Extraction

The system identifies potential relationships using domain-specific patterns, structured records, and text proximity analysis.

Examples include:

- A phone number communicating with another phone number.
- A bank account transferring funds to another account.
- A person associated with a case record.
- A vehicle mentioned in an incident report.
- An entity appearing in multiple documents.

Extracted relationships retain their source context wherever available.

### Step 4: Entity Resolution

The same entity may appear under slightly different names, formats, or identifiers in different datasets.

The entity-resolution module compares normalized attributes and available identifiers to identify potential duplicates.

This helps consolidate records that likely refer to the same entity while avoiding unsupported assumptions that similar names necessarily represent the same person.

### Step 5: Knowledge Graph Construction

Neo4j stores the resulting entities and relationships as a connected graph.

Nodes represent entities such as persons, phones, vehicles, bank accounts, organizations, locations, documents, and cases.

Edges represent relationships between those entities.

The graph includes provenance information so investigators can inspect the source records behind identified connections.

### Step 6: Graph Analytics

The analytics layer helps investigators explore the graph through:

- Degree centrality to identify highly connected entities.
- Connected components to identify separate network groups.
- Clustering coefficients to examine local connectivity.
- Shortest-path queries to trace possible connections between entities.
- Anomaly indicators to identify unusual graph structures for further examination.

These outputs help prioritize investigative review. A highly connected entity or an unusual graph pattern does not, by itself, establish criminal involvement.

---

## 5. Core Features

### Unified Intelligence Ingestion

Processes data from multiple registries, records, transactions, and narrative documents through dedicated ingestion services.

### AI-Assisted Entity Extraction

Uses named entity recognition and domain-specific rules to identify relevant people, identifiers, organizations, locations, and other entities.

### Relationship Discovery

Extracts potential links from structured records and unstructured narratives to reveal connections that may not be obvious when examining individual documents.

### Cross-Source Entity Resolution

Identifies potential duplicate entities across datasets using normalized attributes and matching rules.

### Provenance-Aware Knowledge Graph

Connects entities and relationships in Neo4j while retaining source-document references and evidence context.

### Network Exploration

Supports entity search, neighborhood exploration, pathfinding, and graph traversal through REST APIs.

### Graph Analytics and Anomaly Indicators

Highlights connectivity patterns, network structures, isolated nodes, and unusual relationships for human review.

### Evidence Traceability

Allows investigators to inspect the records associated with an entity or relationship instead of relying solely on an automatically generated conclusion.

---

## 6. Technical Architecture

### Backend

- Python
- FastAPI
- REST APIs
- Modular ingestion services
- NLP and entity-resolution components

### NLP and Information Extraction

- Named entity recognition
- Domain-specific pattern matching
- Relationship extraction
- Text normalization
- Entity resolution using normalized attributes

### Knowledge Graph

- Neo4j
- Graph traversal
- Shortest-path queries
- Entity neighborhoods
- Provenance-aware relationships

### Analytics

- Graph centrality
- Connected components
- Clustering coefficient
- Anomaly indicators
- Network structure exploration

### API Modules

- `entities.py` — Entity search and management
- `graph.py` — Graph traversal, neighborhoods, and pathfinding
- `analytics.py` — Graph analytics
- `evidence.py` — Evidence and provenance access
- `anomalies.py` — Graph anomaly indicators

### Data Ingestion Services

The MVP includes dedicated services for:

- Phone registries
- Vehicle registries
- Bank accounts
- Organizations
- Locations
- Criminal records
- Call detail records
- Financial transactions
- Case metadata
- FIR records and narratives
- Social media records
- Email records

---

## 7. What Makes PoliceBridge Different?

Traditional record-by-record investigation can make it difficult to understand how information across multiple sources fits together.

PoliceBridge focuses on connecting those records into a unified relationship graph.

Its key differentiators are:

**1. From isolated records to connected intelligence**

Information from different sources is brought together to reveal potential relationships across datasets.

**2. From fragmented formats to a unified graph**

Structured records and narrative text are processed through a common pipeline and represented in a consistent knowledge graph.

**3. From suspected connections to traceable evidence**

Relationships can retain references to their originating records, allowing investigators to examine the underlying information.

**4. From manual exploration to graph-assisted analysis**

Graph traversal and analytics help investigators navigate complex networks and identify relationships that warrant further examination.

**5. From automated outputs to human-reviewed leads**

The system supports investigative reasoning rather than automatically declaring individuals guilty or treating inferred relationships as established facts.

---

## 8. The Impact

PoliceBridge aims to improve how investigators access and interpret complex information.

### Operational Impact

- Reduces the need to manually correlate every record in isolation.
- Makes cross-source relationship exploration more systematic.
- Helps investigators navigate large collections of connected records.
- Makes evidence sources easier to trace and review.

### Analytical Impact

- Helps reveal relationships that may be overlooked when examining separate datasets.
- Supports exploration of network structures and possible intermediaries.
- Helps identify unusual connectivity patterns for further examination.
- Provides a structured foundation for future temporal, geospatial, and advanced NLP capabilities.

The MVP demonstrates these capabilities using available datasets. Actual improvements in investigation time, accuracy, or case outcomes would require evaluation against appropriate real-world baselines.

---

## 9. Responsible Use and Limitations

PoliceBridge is an investigative decision-support prototype, not an autonomous criminal identification or guilt-determination system.

- Connections between entities must be interpreted in context.
- Shared identifiers, similar names, or graph proximity do not necessarily establish identity or criminal association.
- Automated entity matching and NLP extraction may produce errors.
- Graph anomalies are indicators for review, not proof of wrongdoing.
- Sensitive data must be protected through appropriate access controls, secure deployment, and data-handling policies.
- Demonstrations should use authorized or synthetic datasets.

The system is designed to help investigators examine information, verify sources, and make informed decisions under appropriate human oversight.

---

## 10. Future Enhancements

Potential future development includes:

1. Transformer-based entity and relationship extraction.
2. Temporal analysis of changing relationships.
3. Geospatial visualization of events and locations.
4. Interactive graph visualization for investigators.
5. More advanced anomaly detection and link prediction.
6. Multilingual extraction for Indian-language records.
7. Streaming ingestion for supported data sources.
8. Role-based access control and audit logging.
9. Confidence-aware entity resolution and relationship review workflows.
10. Improved evidence provenance and chain-of-custody support.

These are future enhancements and should not be presented as completed MVP functionality unless implemented and tested.

---

## 11. Alignment with Devlympics – Shunya 2026

**Theme: Bridge the Gap**

PoliceBridge interprets the challenge as a gap between fragmented investigative information and the ability to understand connections across it.

The two sides are:

- **Side A:** Disconnected records, isolated databases, and unstructured investigative documents.
- **Side B:** Investigators who need a connected, traceable view of potential relationships.

The bridge is the combination of entity extraction, relationship discovery, entity resolution, a provenance-aware knowledge graph, and graph analytics.

By connecting these components, PoliceBridge transforms fragmented information into a structured environment that investigators can explore and verify.

The project demonstrates how AI and graph technology can bridge an information gap without replacing human judgment.

## 12. Central Idea

**PoliceBridge connects the dots between fragmented criminal intelligence and investigative understanding.**

It brings disconnected records into a unified knowledge graph, helping investigators discover, explore, and verify potential relationships across sources.

The goal is not to automate judgment. It is to make relevant information more connected, traceable, and useful for the people responsible for investigating it.

---

### Built for Devlympics – Shunya 2026

Google Developer Groups on Campus  
Netaji Subhas University of Technology (NSUT)

*Bridge the Gap — Connecting fragmented intelligence to a clearer investigative picture.*
