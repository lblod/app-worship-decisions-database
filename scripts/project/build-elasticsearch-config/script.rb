require 'bundler/inline'
$stdout.sync = true
gemfile do
  source 'https://rubygems.org'
  gem 'linkeddata'
end

ROLE = "EredienstBesluitendatabank-BesluitendatabankLezer";
SPEC_NAME = "o-wdbd-r";
SPARQL_CLIENT = "http://virtuoso:8890/sparql"


def client
    @client ||= SPARQL::Client.new(SPARQL_CLIENT)
end

def query(role) 
    q = %|
            PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
            PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
            SELECT DISTINCT ?session_group  WHERE {
            ?sessionId ext:sessionGroup/mu:uuid ?session_group;
                        ext:sessionRole ?session_role.
            FILTER( ?session_role = "#{role}" )
            }
        |   
    return  client.query(q)
end

def get_eager_index_groups() 
    data = query(ROLE);
    search_conf = []
    session_group = data.map { |b| b.session_group.value };

    session_group.each do |sg|
        json = %|
            [
                {
                "variables": [],
                "name": "clean"
                },
                {
                "variables": [],
                "name": "public"
                },
                {
                "name": "#{SPEC_NAME}",
                "variables": ["#{sg}", "#{ROLE}"]
                }
            ]
        |
        search_conf << json

   end
    return search_conf.join(',');
end


def make_config() 
    groups = get_eager_index_groups();

    config = %| 
        {
        "batch_size": 128,
        "max_batches": 0,
        "attachments_path_base": "/data/",
        "eager_indexing_sparql_query": false,
        "additive_indexes": true,
        "persist_indexes": true,
        "update_wait_interval_minutes": 0,
        "automatic_index_updates": true,
        "eager_indexing_groups": [
            [
                {
                  "name": "clean",
                  "variables": []
                }
            ],
            [
                {
                  "name": "public",
                  "variables": []
                }
            ],
            [
                {
                  "name": "readers",
                  "variables": []
                }
            ],
            #{groups}
        ],
        "default_settings": #{File.read('./default_settings.json')},
        "types": #{File.read("./default_types.json")}
        }
    |

    puts config
end

make_config()