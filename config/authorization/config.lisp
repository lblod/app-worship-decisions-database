;;;;;;;;;;;;;;;;;;;
;;; delta messenger
(in-package :delta-messenger)

(add-delta-logger)
(add-delta-messenger "http://deltanotifier/")

;;;;;;;;;;;;;;;;;
;;; configuration
(in-package :client)
(setf *log-sparql-query-roundtrip* t)
(setf *backend* "http://virtuoso:8890/sparql")

(in-package :server)
(setf *log-incoming-requests-p* t)

;;;;;;;;;;;;;;;;;
;;; access rights
(in-package :acl)

(defparameter *access-specifications* nil)
(defparameter *graphs* nil)
(defparameter *rights* nil)

;; Prefixes used in the constraints below (not in the SPARQL queries)
(define-prefixes
  :besluit "http://data.vlaanderen.be/ns/besluit#"
  :adms "http://www.w3.org/ns/adms#"
  :nfo "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#"
  :prov "http://www.w3.org/ns/prov#"
  :skos "http://www.w3.org/2004/02/skos/core#"
  :ext "http://mu.semte.ch/vocabularies/ext/"
  :foaf "http://xmlns.com/foaf/0.1/")

(type-cache::add-type-for-prefix "http://mu.semte.ch/sessions/" "http://mu.semte.ch/vocabularies/session/Session")

(define-graph public ("http://mu.semte.ch/graphs/public")
  ("foaf:Person" -> _)
  ("foaf:OnlineAccount" -> _)
  ("besluit:Bestuurseenheid" -> _)
  ("ext:BestuurseenheidClassificatieCode" -> _)
  ("besluit:Bestuursorgaan" -> _)
  ("ext:BestuursorgaanClassificatieCode" -> _)
  ("ext:AuthenticityType" -> _)
  ("skos:ConceptScheme" -> _)
  ("skos:Concept" -> _)
  ("prov:Location" -> _)
  ("http://mu.semte.ch/graphs/system/email" -> _))

(define-graph org ("http://mu.semte.ch/graphs/organizations/")
  ("foaf:Person" -> _)
  ("foaf:OnlineAccount" -> _)
  ("adms:Identifier" -> _))

(define-graph readers ("http://mu.semte.ch/graphs/organizations/")
  ("nfo:FileDataObject" -> _)
  ("nfo:RemoteDataObject" -> _)
  ("foaf:Document" -> _)
  ("http://rdf.myexperiment.org/ontologies/base/Submission" -> _)
  ("ext:SubmissionDocument" -> _)
  ("http://lblod.data.gift/vocabularies/automatische-melding/FormData" -> _)
  ("foaf:Person" -> _)
  ("foaf:OnlineAccount" -> _)
  ("besluit:Bestuurseenheid" -> _)
  ("ext:BestuurseenheidClassificatieCode" -> _)
  ("besluit:Bestuursorgaan" -> _)
  ("ext:BestuursorgaanClassificatieCode" -> _)
  ("ext:AuthenticityType" -> _)
  ("skos:ConceptScheme" -> _)
  ("skos:Concept" -> _)
  ("prov:Location" -> _))

(define-graph sessions ("http://mu.semte.ch/graphs/sessions")
  ("http://mu.semte.ch/sessions/" -> _))

(define-graph admin-sessions-public ("http://mu.semte.ch/graphs/public")
  ("foaf:OnlineAccount" -> _))

(define-graph subscribed-for-notifications ("http://mu.semte.ch/graphs/organizations/")
  ("ext:mailAdresVoorNotificaties" -> _)
  ("ext:wilMailOntvangen" -> _))

(define-graph reports ("http://mu.semte.ch/graphs/reports")
  ("http://lblod.data.gift/vocabularies/reporting/Report" -> _)
  ("http://open-services.net/ns/core#Error" -> _)
  ("nfo:DataContainer" -> _)
  ("nfo:FileDataObject" -> _))

(define-graph jobs ("http://mu.semte.ch/graphs/system/jobs")
  ("http://vocab.deri.ie/cogs#Job" -> _)
  ("nfo:DataContainer" -> _)
  ("nfo:FileDataObject" -> _))

(define-graph vendors ("http://mu.semte.ch/graphs/vendors/")
  ("http://rdf.myexperiment.org/ontologies/base/Submission" -> _)
  ("ext:SubmissionDocument" -> _)
  ("http://lblod.data.gift/vocabularies/automatische-melding/FormData" -> _)
  ("nfo:FileDataObject" -> _)
  ("nfo:RemoteDataObject" -> _))

(supply-allowed-group "public")

(supply-allowed-group "logged-in-or-impersonating"
  :parameters ("session_group")
  :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
          SELECT DISTINCT ?session_group WHERE {
            {
              <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group.
            } UNION {
              <SESSION_ID> ext:originalSessionGroup/mu:uuid ?session_group.
            }
          }")

(supply-allowed-group "LoketLB-databankEredienstenGebruiker"
  :parameters ("session_group" "session_role")
  :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
          SELECT DISTINCT ?session_group ?session_role WHERE {
            <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group;
                        ext:sessionRole ?session_role.
            FILTER(?session_role = \"LoketLB-databankEredienstenGebruiker\")
          }")

(supply-allowed-group "LoketLB-databankEredienstenGebruiker-LF"
  :parameters ("session_group" "session_role")
  :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
          SELECT DISTINCT ?session_group ?session_role WHERE {
            <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group;
                        ext:sessionRole ?session_role.
            FILTER(?session_role = \"LoketLB-databankEredienstenGebruiker-LF\")
          }")

(supply-allowed-group "admin"
  :parameters ()
  :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          SELECT DISTINCT ?session_role WHERE {
            VALUES ?session_role { \"LoketLB-AdminDatabankErediensten\" }
            VALUES ?session_id { <SESSION_ID> }
            { ?session_id ext:sessionRole ?session_role }
            UNION
            { ?session_id ext:originalSessionRole ?session_role }
          } LIMIT 1")

(supply-allowed-group "dashboard-admin"
  :parameters ()
  :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          SELECT DISTINCT ?session WHERE {
            VALUES ?session { <SESSION_ID> }
            ?session ext:sessionRole
              \"LoketLB-AdminDashboardDatabankEredienstenGebruiker\" .
          }")

(supply-allowed-group "vendor-api"
  :parameters ("vendor_id" "session_group")
  :query "PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
          PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
          SELECT DISTINCT ?vendor_id ?session_group WHERE {
            <SESSION_ID> muAccount:canActOnBehalfOf/mu:uuid ?session_group;
                         muAccount:account/mu:uuid ?vendor_id.
          }")

(grant (read)
  :to-graph (public)
  :for-allowed-group "public")

(grant (read)
  :to-graph (org)
  :for-allowed-group "logged-in-or-impersonating")

(grant (read)
  :to-graph (readers)
  :for-allowed-group "LoketLB-databankEredienstenGebruiker")

(grant (read)
  :to-graph (readers)
  :for-allowed-group "LoketLB-databankEredienstenGebruiker-LF")

(grant (read write)
  :to-graph (sessions)
  :for-allowed-group "admin")

(grant (read write)
  :to-graph (admin-sessions-public)
  :for-allowed-group "admin")

(grant (read write)
  :to-graph (subscribed-for-notifications)
  :for-allowed-group "LoketLB-databankEredienstenGebruiker")

(grant (read write)
  :to-graph (reports)
  :for-allowed-group "dashboard-admin")

(grant (read write)
  :to-graph (jobs)
  :for-allowed-group "dashboard-admin")

(grant (read)
  :to-graph (vendors)
  :for-allowed-group "vendor-api")