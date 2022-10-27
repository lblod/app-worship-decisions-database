- Potential errors:
`elasticsearch_1            | bootstrap check failure [2] of [2]: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]`
run `sudo sysctl -w vm.max_map_count=262144`

This adds 3 elasticsearch nodes (and bump mu-search / elastic image to the latest available version).

That increase the maximum of indexes to 3000 (1000 per node), but if it's still not enough for worship decisions database, the previous workaround
still works (you can also add more elastic nodes)

The environment variable `"bootstrap.memory_lock=false"` should be set to true for performance matters (but not really mandatory) in a cluster context.
this requires some work in the server itself, see:
https://www.elastic.co/guide/en/elasticsearch/reference/current/setup-configuration-memory.html
