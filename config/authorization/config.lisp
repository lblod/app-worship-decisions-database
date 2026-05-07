;; We disable the exception on unwritten data for now. The frontend sends extra attributes when saving the email notification settings which triggers the exception.
;; Once we update the frontend to only send the needed fields we can remove it again.
;; The extra code is needed because of a bug in sparql-parser if the error handling is disabled.
;; Credits to Aad.
;; TODO: remove this once the frontend doesn't send the extra attributes.
(in-package #:handle-update-unit)

(setf handle-update-unit::*unwritten-data-actions* '(:log))

(defun process-quads-to-operations (&key delete insert)
  "Processes the dispatching of quads for insertion, yielding multiple values for various types of operations.

ALL-USED-INSERTS and ALL-USED-DELETES are determined after dispatching to the right graph and can thus be used for
locking.

(VALUES
    EFFECTIVE-SPARQL-DELETES EFFECTIVE-SPARQL-INSERTS
    DELTA-EFFECTIVE-DELETES DELTA-EFFECTIVE-INSERTS
    DELTA-ALL-DELETES DELTA-ALL-INSERTS
    DELTA-EFFECTIVE-DELETES DELTA-EFFECTIVE-INSERTS
    ALL-USED-DELETES ALL-USED-INSERTS
    ALL-UNTREATED-DELETES ALL-UNTREATED-INSERTS)"
  (let* (;; we first ensure inserts and deletes are matched through ACL
         (dispatched-delete-quads (acl:dispatch-quads delete))
         (dispatched-insert-quads (acl:dispatch-quads insert))
         ;; if we want to know which quads are untreated and treated as they arrived, this is where we need to calculate it
         (treated-delete-quads (support:filter-array dispatched-delete-quads #'acl:dispatched-quad-treated-p))
         (treated-insert-quads (support:filter-array dispatched-insert-quads #'acl:dispatched-quad-treated-p))
         (untreated-delete-quads (support:filter-array dispatched-delete-quads
                                                       (alexandria:compose #'null #'acl:dispatched-quad-treated-p)))
         (untreated-insert-quads (support:filter-array dispatched-insert-quads
                                                       (alexandria:compose #'null #'acl:dispatched-quad-treated-p)))
         ;; we can run user transformations on each of these individual quads
         (user-transformed-delete-quads (quad-transformations:user-transform-quads treated-delete-quads :method :delete))
         (user-transformed-insert-quads (quad-transformations:user-transform-quads treated-insert-quads :method :insert))
         ;; now fold all quads which are essentially the same so we can treat them together.
         ;; this folding seems redundant, but splitting up beforehand allows us to choose how to handle things here
         (folded-dispatched-delete-quads (fold-dispatched-quads-array user-transformed-delete-quads))
         (folded-dispatched-insert-quads (fold-dispatched-quads-array user-transformed-insert-quads))
         ;; detect what goes through sparql and delta
         (sparql-delete-quads (support:filter-array folded-dispatched-delete-quads #'acl:dispatched-quad-sparql-p))
         (sparql-insert-quads (support:filter-array folded-dispatched-insert-quads #'acl:dispatched-quad-sparql-p))
         (all-delta-delete-quads (support:filter-array folded-dispatched-delete-quads #'acl:dispatched-quad-delta-p))
         (all-delta-insert-quads (support:filter-array folded-dispatched-insert-quads #'acl:dispatched-quad-delta-p))
         ;; once we have the effective content to alter, we can safely create files from long strings
         (sparql-delete-quads-with-string-file-uris
           (support:map-array-same-type sparql-delete-quads #'alter-dispatched-quad-to-string-file-uris))
         (sparql-insert-quads-with-string-file-uris
           (support:map-array-same-type sparql-insert-quads #'alter-dispatched-quad-to-string-file-uris))
         ;; the following would be interesting, but we don't care because any delta quad should be added to all-delta
         ;; and not to the effective-delta changes
         ;; (delta-only-delete-quads (support:filter-array folded-dispatched-delete-quads
         ;;                                                (lambda (q) (and (acl:dispatched-quad-delta-p q)
         ;;                                                                 (not (acl:dispatched-quad-sparql-p q))))))
         ;; (delta-only-insert-quads (support:filter-array folded-dispatched-delete-quads
         ;;                                                (lambda (q) (and (acl:dispatched-quad-delta-p q)
         ;;                                                                 (not (acl:dispatched-quad-sparql-p q))))))
         )
    (multiple-value-bind (effective-deletes effective-inserts)
        (detect-effective-changes :dispatched-delete-quads sparql-delete-quads-with-string-file-uris
                                  :dispatched-insert-quads sparql-insert-quads-with-string-file-uris)
      (values
       ;; effective sparql
       effective-deletes effective-inserts
       ;; effective delta (this is just SPARQL)
       (support:map-array-same-type effective-deletes #'alter-dispatched-quad-string-file-uri-to-string)
       (support:map-array-same-type effective-inserts #'alter-dispatched-quad-string-file-uri-to-string)
       ;; all delta
       all-delta-delete-quads
       all-delta-insert-quads
       ;; used changes (this is after ACL dispatching and should be so but without value transformation)
       folded-dispatched-delete-quads folded-dispatched-insert-quads
       ;; used changes before dispatch
       treated-delete-quads treated-insert-quads
       ;; untreated changes
       untreated-delete-quads untreated-insert-quads))))
;; End TODO

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
  ("http://mu.semte.ch/vocabularies/session/Session" -> _))

(define-graph admin-sessions-public ("http://mu.semte.ch/graphs/public")
  ("foaf:OnlineAccount" -> _))

(define-graph subscribed-for-notifications ("http://mu.semte.ch/graphs/organizations/")
  ("besluit:Bestuurseenheid" -> "ext:mailAdresVoorNotificaties"
                             -> "ext:wilMailOntvangen"))

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