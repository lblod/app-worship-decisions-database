alias Acl.Accessibility.Always, as: AlwaysAccessible
alias Acl.Accessibility.ByQuery, as: AccessByQuery
alias Acl.GraphSpec.Constraint.Resource.NoPredicates, as: NoPredicates
alias Acl.GraphSpec.Constraint.Resource, as: ResourceConstraint
alias Acl.GraphSpec.Constraint.ResourceFormat, as: ResourceFormatConstraint
alias Acl.GraphSpec, as: GraphSpec
alias Acl.GroupSpec, as: GroupSpec
alias Acl.GroupSpec.GraphCleanup, as: GraphCleanup

defmodule Acl.UserGroups.Config do
  defp access_by_role( group_string ) do
    %AccessByQuery{
      vars: ["session_group","session_role"],
      query: sparql_query_for_access_role( group_string ) }
  end

  defp access_by_role_for_single_graph( group_string ) do
    %AccessByQuery{
      vars: [],
      query: sparql_query_for_access_role( group_string ) }
  end

  defp sparql_query_for_access_role( group_string ) do
    "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    SELECT DISTINCT ?session_group ?session_role WHERE {
      <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group;
                   ext:sessionRole ?session_role.
      FILTER( ?session_role = \"#{group_string}\" )
    }"
  end


  defp is_admin() do
    %AccessByQuery{
      vars: [],
      query: "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

        SELECT DISTINCT ?session_role WHERE {
          VALUES ?session_role {
            \"LoketLB-AdminDatabankErediensten\"
          }

          VALUES ?session_id {
            <SESSION_ID>
          }

          {
            ?session_id ext:sessionRole ?session_role .
          } UNION {
            ?session_id ext:originalSessionRole ?session_role .
          }
        }
        LIMIT 1"
      }
  end

  defp can_access_dashboard() do
    %AccessByQuery{
      vars: [],
      query: "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        SELECT DISTINCT ?account WHERE {
          <SESSION_ID> <http://mu.semte.ch/vocabularies/session/account> ?account.
          ?account <http://mu.semte.ch/vocabularies/ext/sessionRole> ?session_role.
          FILTER( ?session_role = \"DatabankErediensten-dashboard-user\" )
        }"
      }
  end

  defp access_for_vendor_api() do
    %AccessByQuery{
      vars: ["vendor_id", "session_group"],
      query: sparql_query_for_access_vendor_api()
    }
  end

  defp sparql_query_for_access_vendor_api() do
    " PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      SELECT DISTINCT ?vendor_id ?session_group WHERE {
        <SESSION_ID> muAccount:canActOnBehalfOf/mu:uuid ?session_group;
                     muAccount:account/mu:uuid ?vendor_id.
      } "
  end

  def user_groups do
    # These elements are walked from top to bottom.  Each of them may
    # alter the quads to which the current query applies.  Quads are
    # represented in three sections: current_source_quads,
    # removed_source_quads, new_quads.  The quads may be calculated in
    # many ways.  The useage of a GroupSpec and GraphCleanup are
    # common.
    [
      # // PUBLIC
      %GroupSpec{
        name: "public",
        useage: [:read],
        access: %AlwaysAccessible{}, # Needed for mock-login
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/public",
                    constraint: %ResourceConstraint{
                      resource_types: [
                        "http://xmlns.com/foaf/0.1/Person",
                        "http://xmlns.com/foaf/0.1/OnlineAccount",
                        "http://data.vlaanderen.be/ns/besluit#Bestuurseenheid",
                        "http://mu.semte.ch/vocabularies/ext/BestuurseenheidClassificatieCode",
                        "http://data.vlaanderen.be/ns/besluit#Bestuursorgaan",
                        "http://mu.semte.ch/vocabularies/ext/BestuursorgaanClassificatieCode",
                        "http://mu.semte.ch/vocabularies/ext/AuthenticityType",
                        "http://www.w3.org/2004/02/skos/core#ConceptScheme",
                        "http://www.w3.org/2004/02/skos/core#Concept",
                        "http://www.w3.org/ns/prov#Location",
                        "http://mu.semte.ch/graphs/system/email"
                      ]
                    } } ] },
      %GroupSpec{
        name: "org",
        useage: [:read],
        access: %AccessByQuery{
          vars: ["session_group"],
          query: "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
                  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
                  SELECT DISTINCT ?session_group WHERE {
                    {
                      <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group.
                    } UNION {
                      <SESSION_ID> ext:originalSessionGroup/mu:uuid ?session_group.
                    }
                  }" },
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/organizations/",
                    constraint: %ResourceConstraint{
                      resource_types: [
                        "http://xmlns.com/foaf/0.1/Person",
                        "http://xmlns.com/foaf/0.1/OnlineAccount",
                        "http://www.w3.org/ns/adms#Identifier",
                      ] } } ] },
      # // Logged in users
      %GroupSpec{
        name: "readers",
        useage: [:read],
      access: access_by_role("LoketLB-databankEredienstenGebruiker"),
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/organizations/",
                    constraint: %ResourceConstraint{
                      resource_types: [
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#RemoteDataObject",
                        "http://xmlns.com/foaf/0.1/Document",
                        "http://rdf.myexperiment.org/ontologies/base/Submission",
                        "http://mu.semte.ch/vocabularies/ext/SubmissionDocument",
                        "http://lblod.data.gift/vocabularies/automatische-melding/FormData",
                        "http://xmlns.com/foaf/0.1/Person",
                        "http://xmlns.com/foaf/0.1/OnlineAccount",
                        "http://data.vlaanderen.be/ns/besluit#Bestuurseenheid",
                        "http://mu.semte.ch/vocabularies/ext/BestuurseenheidClassificatieCode",
                        "http://data.vlaanderen.be/ns/besluit#Bestuursorgaan",
                        "http://mu.semte.ch/vocabularies/ext/BestuursorgaanClassificatieCode",
                        "http://mu.semte.ch/vocabularies/ext/AuthenticityType",
                        "http://www.w3.org/2004/02/skos/core#ConceptScheme",
                        "http://www.w3.org/2004/02/skos/core#Concept",
                        "http://www.w3.org/ns/prov#Location"
                      ]
                    } } ] },
      %GroupSpec{
        name: "readers",
        useage: [:read],
      access: access_by_role("LoketLB-databankEredienstenGebruiker-LF"),
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/organizations/",
                    constraint: %ResourceConstraint{
                      resource_types: [
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#RemoteDataObject",
                        "http://xmlns.com/foaf/0.1/Document",
                        "http://rdf.myexperiment.org/ontologies/base/Submission",
                        "http://mu.semte.ch/vocabularies/ext/SubmissionDocument",
                        "http://lblod.data.gift/vocabularies/automatische-melding/FormData",
                        "http://xmlns.com/foaf/0.1/Person",
                        "http://xmlns.com/foaf/0.1/OnlineAccount",
                        "http://data.vlaanderen.be/ns/besluit#Bestuurseenheid",
                        "http://mu.semte.ch/vocabularies/ext/BestuurseenheidClassificatieCode",
                        "http://data.vlaanderen.be/ns/besluit#Bestuursorgaan",
                        "http://mu.semte.ch/vocabularies/ext/BestuursorgaanClassificatieCode",
                        "http://mu.semte.ch/vocabularies/ext/AuthenticityType",
                        "http://www.w3.org/2004/02/skos/core#ConceptScheme",
                        "http://www.w3.org/2004/02/skos/core#Concept",
                        "http://www.w3.org/ns/prov#Location"
                      ]
                    } } ] },
      # // Admin users
      %GroupSpec{
        name: "o-admin-sessions-rwf",
        useage: [:read, :write, :read_for_write],
        access: is_admin(),
        graphs: [
          %GraphSpec{
            graph: "http://mu.semte.ch/graphs/sessions",
            constraint: %ResourceFormatConstraint{
              resource_prefix: "http://mu.semte.ch/sessions/"
            }
          },
        ]
      },
      %GroupSpec{
        name: "o-admin-sessions-rwf",
        useage: [:read_for_write],
        access: is_admin(),
        graphs: [
          %GraphSpec{
            graph: "http://mu.semte.ch/graphs/public",
            constraint: %ResourceConstraint {
              resource_types: [
                "http://xmlns.com/foaf/0.1/OnlineAccount"
                ],
            }
          },
        ]
      },
      # // subscribe for email notifications
      %GroupSpec{
        name: "subscribed-for-notifications",
        useage: [:read, :write, :read_for_write],
      access: access_by_role("LoketLB-databankEredienstenGebruiker"),
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/organizations/",
                    constraint: %ResourceConstraint{
                      resource_types: [ "http://data.vlaanderen.be/ns/besluit#Bestuurseenheid" ],
                      predicates: %NoPredicates{
                        except: [
                          "http://mu.semte.ch/vocabularies/ext/mailAdresVoorNotificaties",
                          "http://mu.semte.ch/vocabularies/ext/wilMailOntvangen"
                        ] }
                    } } ] },
      # // dashboard users
      %GroupSpec{
        name: "dashboard-users",
        useage: [:read],
        access: can_access_dashboard(),
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/reports",
                    constraint: %ResourceConstraint{
                      resource_types: [
                        "http://lblod.data.gift/vocabularies/reporting/Report",
                        "http://open-services.net/ns/core#Error",
                          "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#DataContainer",
                          "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
                          "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#DataContainer"
                      ]
                    } },

                   %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/system/jobs",
                    constraint: %ResourceConstraint{
                      resource_types: [
                        "http://vocab.deri.ie/cogs#Job",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#DataContainer",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#DataContainer"
                      ]
                    } },
                   ] },
      %GroupSpec{
      name: "o-vendor-api-r",
      useage: [:read],
      access: access_for_vendor_api(),
      graphs: [
        %GraphSpec{
          graph: "http://mu.semte.ch/graphs/vendors/",
          constraint: %ResourceConstraint{
            resource_types: [
              "http://rdf.myexperiment.org/ontologies/base/Submission",
              "http://mu.semte.ch/vocabularies/ext/SubmissionDocument",
              "http://lblod.data.gift/vocabularies/automatische-melding/FormData",
              "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
              "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#RemoteDataObject"
            ] } } ] },

      # // CLEANUP
      #
      %GraphCleanup{
        originating_graph: "http://mu.semte.ch/application",
        useage: [:write],
        name: "clean"
      }
    ]
  end
end
