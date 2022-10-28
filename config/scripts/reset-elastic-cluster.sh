#!/bin/bash
echo "warning this will run queries on the triplestore and delete containers, you have 3 seconds to press ctrl+c"
sleep 3
docker-compose rm -fs elasticsearch elasticsearch2 elasticsearch3 search
sudo rm -rf data/elasticsearch/
docker-compose exec -T virtuoso isql-v <<EOF
SPARQL DELETE WHERE {   GRAPH <http://mu.semte.ch/authorization> {     ?s ?p ?o.   } };
exec('checkpoint');
exit;
EOF
echo "We will bring containers up again, we expect the docker-compose files to be run defined in a .env file"
echo "If in doubt; you have 10 seconds to press ctrl+c"
sleep 10
docker-compose up -d --remove-orphan
