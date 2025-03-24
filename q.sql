-- Nodes: Combine producers and consumers
SELECT 
  namespace || '_' || producer AS id,  -- Unique ID (e.g., "ns1_producerA")
  producer AS label,                   -- Display name
  'producer' AS type                   -- Node type
FROM your_table
UNION
SELECT 
  namespace || '_' || consumer AS id,  -- Unique ID (e.g., "ns1_consumerX")
  consumer AS label,                   -- Display name
  'consumer' AS type                   -- Node type
FROM your_table;

-- Edges: Traffic between producers and consumers
SELECT 
  namespace || '_' || producer AS source,  -- Source node ID
  namespace || '_' || consumer AS target,  -- Target node ID
  SUM(traffic) AS value                    -- Aggregated traffic metric
FROM your_table
GROUP BY namespace, producer, consumer     -- Optional: Group by to aggregate traffic
