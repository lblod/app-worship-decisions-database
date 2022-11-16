require 'bundler/inline'
$stdout.sync = true
gemfile do
  source 'https://rubygems.org'
  gem 'linkeddata'
end

ROLE = "DatabankeredienstenGebruiker";
SPEC_NAME = "o-wdbd-r";
SPARQL_CLIENT = "http://virtuoso:8890/sparql"


def client
    @client ||= SPARQL::Client.new(SPARQL_CLIENT)
end

def query()
    q = %|
            PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
            PREFIX mu: <http://mu.semte.ch/vocabularies/core/>

            SELECT DISTINCT ?s ?uuid ?label WHERE {
              ?s a besluit:Bestuurseenheid;
                skos:prefLabel ?label;
                mu:uuid ?uuid.
            }
            ORDER BY ?label ?uuid
        |
    return client.query(q)
end

def get_eager_index_groups()
    #                "comment": "Config for #{sg.label.value} (#{sg.s.value})",
    data = query();
    search_conf = [];
    data.each do |sg|
        json = %|
        [{"name": "clean", "variables": []}, {"name": "public", "variables" : []}, {"name": "readers", "variables" : []},
            {
                "name": "#{SPEC_NAME}",
                "variables": ["#{sg.uuid.value}", "#{ROLE}"]
            }
        ,
            {
                "name": "org",
                "variables": ["#{sg.uuid.value}", "org"]
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
        "additive_indexes": false,
        "persist_indexes": true,
        "update_wait_interval_minutes": 0,
        "automatic_index_updates": true,
        "eager_indexing_groups": [
                [{"name": "clean", "variables": []}, {"name": "public", "variables" : []}],
                [{"name": "clean", "variables": []}, {"name": "public", "variables" : []}, {"name": "readers", "variables" : []}],

                #{groups}
        ],
        "default_settings": #{File.read('./default_settings.json')},
        "types": #{File.read("./default_types.json")}
        }
    |

    puts config
end

make_config()
