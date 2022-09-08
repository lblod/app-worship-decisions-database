const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 100;
const MU_CALL_SCOPE_ID_INITIAL_SYNC = process.env.MU_CALL_SCOPE_ID_INITIAL_SYNC || 'http://redpencil.data.gift/id/concept/muScope/deltas/consumer/initialSync';
const BYPASS_MU_AUTH_FOR_EXPENSIVE_QUERIES = process.env.BYPASS_MU_AUTH_FOR_EXPENSIVE_QUERIES == 'true' ? true : false;
const DIRECT_DATABASE_ENDPOINT = process.env.DIRECT_DATABASE_ENDPOINT || 'http://virtuoso:8890/sparql';
const MAX_DB_RETRY_ATTEMPTS = parseInt(process.env.MAX_DB_RETRY_ATTEMPTS || 5);
const SLEEP_BETWEEN_BATCHES = parseInt(process.env.SLEEP_BETWEEN_BATCHES || 1000);
const SLEEP_TIME_AFTER_FAILED_DB_OPERATION = parseInt(process.env.SLEEP_TIME_AFTER_FAILED_DB_OPERATION || 60000);
const TMP_INGEST_GRAPH = process.env.TMP_INGEST_GRAPH || `http://mu.semte.ch/graphs/tmp-ingest-submissions-consumer`;
const ABB_URI = process.env.ABB_URI || 'http://data.lblod.info/id/bestuurseenheden/141d9d6b-54af-4d17-b313-8d1c30bc3f5b'

const MAPPING_SUBMISSION_TYPE_ACCESSIBLE_BY_UNITS = [
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitDocumentType/8e791b27-7600-4577-b24e-c7c29e0eb773",
    "accessibleBy": [
      "REPRESENTATIVE_BODY",
      "INVOLVED_LOCAL_AUTHORITIES",
      "ABB"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitType/e44c535d-4339-4d15-bdbf-d4be6046de2c",
    "accessibleBy": [
      "CENTRAL_WORSHIP_SERVICE",
      "INVOLVED_LOCAL_AUTHORITIES",
      "ABB"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitDocumentType/672bf096-dccd-40af-ab60-bd7de15cc461",
    "accessibleBy": [
      "INVOLVED_LOCAL_AUTHORITIES",
      "ABB"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitType/79414af4-4f57-4ca3-aaa4-f8f1e015e71c",
    "accessibleBy": [
      "ABB"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitType/54b61cbd-349f-41c4-9c8a-7e8e67d08347",
    "accessibleBy": [
      "ABB"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitType/40831a2c-771d-4b41-9720-0399998f1873",
    "accessibleBy": [
      "CENTRAL_WORSHIP_SERVICE",
      "REPRESENTATIVE_BODY",
      "INVOLVED_LOCAL_AUTHORITIES"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitDocumentType/18833df2-8c9e-4edd-87fd-b5c252337349",
    "accessibleBy": [
      "REPRESENTATIVE_BODY",
      "INVOLVED_LOCAL_AUTHORITIES"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitType/df261490-cc74-4f80-b783-41c35e720b46",
    "accessibleBy": [
      "WORSHIP_SERVICE",
      "CENTRAL_WORSHIP_SERVICE",
      "REPRESENTATIVE_BODY",
      "ABB"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitType/f56c645d-b8e1-4066-813d-e213f5bc529f",
    "accessibleBy": [
      "CENTRAL_WORSHIP_SERVICE"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitType/f56c645d-b8e1-4066-813d-e213f5bc529f",
    "accessibleBy": [
      "REPRESENTATIVE_BODY",
      "INVOLVED_LOCAL_AUTHORITIES",
      "ABB"
    ]
  },
  {
    "submissionType": "https://data.vlaanderen.be/id/concept/BesluitDocumentType/2c9ada23-1229-4c7e-a53e-acddc9014e4e",
    "accessibleBy": [
      "REPRESENTATIVE_BODY",
      "INVOLVED_LOCAL_AUTHORITIES",
      "ABB"
    ]
  }
];

const MAPPING_TYPE_AND_PATH_TO_SUBMISSION = [
  {
    "type": "http://rdf.myexperiment.org/ontologies/base/Submission",
    "pathToSubmission": "?submission a <http://rdf.myexperiment.org/ontologies/base/Submission> .\n FILTER(?submission = ?subject)"
  },
  {
    "type": "http://mu.semte.ch/vocabularies/ext/SubmissionDocument",
    "pathToSubmission": "?submission <http://purl.org/dc/terms/subject> ?subject; \n a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://lblod.data.gift/vocabularies/besluit/TaxRate",
    "pathToSubmission": "?submission <http://www.w3.org/ns/prov#generated> ?formData; \n a <http://rdf.myexperiment.org/ontologies/base/Submission>. \n ?formData <http://lblod.data.gift/vocabularies/besluit/taxRate> ?subject."
  },
  {
    "type": "http://mu.semte.ch/vocabularies/ext/AuthenticityType",
    "pathToSubmission": "?submission <http://www.w3.org/ns/prov#generated> ?formData; \n a <http://rdf.myexperiment.org/ontologies/base/Submission>. \n ?formData <http://lblod.data.gift/vocabularies/besluit/authenticityType> ?subject."
  },
  {
    "type": "http://mu.semte.ch/vocabularies/ext/TaxType",
    "pathToSubmission": "?submission <http://www.w3.org/ns/prov#generated> ?formData; \n a <http://rdf.myexperiment.org/ontologies/base/Submission>. \n ?formData <http://mu.semte.ch/vocabularies/ext/taxType> ?subject."
  },
  {
    "type": "http://mu.semte.ch/vocabularies/ext/ChartOfAccount",
    "pathToSubmission": "?submission <http://www.w3.org/ns/prov#generated> ?formData; \n a <http://rdf.myexperiment.org/ontologies/base/Submission>. \n ?formData <http://lblod.data.gift/vocabularies/besluit/chartOfAccount> ?subject."
  },
  {
    "type": "http://www.w3.org/2004/02/skos/core#Concept",
    "pathToSubmission": "?subject <http://www.w3.org/2004/02/skos/core#inScheme> | <http://www.w3.org/2004/02/skos/core#topConceptOf> ?conceptScheme. \n ?submission <http://www.w3.org/ns/prov#generated> ?formData. \n ?formData <http://lblod.data.gift/vocabularies/besluit/authenticityType> | <http://mu.semte.ch/vocabularies/ext/regulationType> | <http://mu.semte.ch/vocabularies/ext/decisionType> | <http://mu.semte.ch/vocabularies/ext/taxType> | <http://data.europa.eu/eli/ontology#passed_by>/<http://data.vlaanderen.be/ns/mandaat#isTijdspecialisatieVan>/<http://data.vlaanderen.be/ns/besluit#bestuurt>/<http://data.vlaanderen.be/ns/besluit#classificatie> ?subject. \n FILTER ( ?conceptScheme IN (\n  <http://lblod.data.gift/concept-schemes/5cecec47-ba66-4d7a-ac9d-a1e7962ca4e2>,\n  <http://lblod.data.gift/concept-schemes/ac9bc402-c8e6-41fd-ad57-fad15622e560>,\n  <https://data.vlaanderen.be/id/conceptscheme/BesluitType>,\n  <https://data.vlaanderen.be/id/conceptscheme/BesluitDocumentType>,\n  <http://data.vlaanderen.be/id/conceptscheme/BestuurseenheidClassificatieCode>,\n  <http://lblod.data.gift/concept-schemes/b65b15ba-6755-4cd2-bd07-2c2cf3c0e4d3>,\n  <http://lblod.data.gift/concept-schemes/c93ccd41-aee7-488f-86d3-038de890d05a>,\n  <http://lblod.data.gift/concept-schemes/71e6455e-1204-46a6-abf4-87319f58eaa5>\n) )"
  },
  {
    "type": "http://lblod.data.gift/vocabularies/automatische-melding/FormData",
    "pathToSubmission": "?submission <http://www.w3.org/ns/prov#generated> ?subject; \n a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
    "pathToSubmission": "?submission <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#hasPart> ?subject. \n ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
    "pathToSubmission": "?subject <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#dataSource> ?remoteFile. \n ?submission <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#hasPart> ?remoteFile. \n ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
    "pathToSubmission": "?subject <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#dataSource>/<http://www.semanticdesktop.org/ontologies/2007/01/19/nie#dataSource> ?remoteFile. ?submission <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#hasPart> ?remoteFile. ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
    "pathToSubmission": "?subject <http://purl.org/dc/terms/type> <http://data.lblod.gift/concepts/meta-file-type>. ?s <http://purl.org/dc/terms/source> ?subject. ?s a <http://mu.semte.ch/vocabularies/ext/SubmissionDocument>. ?submission <http://purl.org/dc/terms/subject> ?s. ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
    "pathToSubmission": "?subject <http://purl.org/dc/terms/type> <http://data.lblod.gift/concepts/form-data-file-type>. ?s <http://purl.org/dc/terms/source> ?subject. ?s a <http://mu.semte.ch/vocabularies/ext/SubmissionDocument>. ?submission <http://purl.org/dc/terms/subject> ?s. ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
    "pathToSubmission": "?subject <http://purl.org/dc/terms/type> <http://data.lblod.gift/concepts/form-file-type>. ?s <http://purl.org/dc/terms/source> ?subject. ?s a <http://mu.semte.ch/vocabularies/ext/SubmissionDocument>. ?submission <http://purl.org/dc/terms/subject> ?s. ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
    "pathToSubmission": "?formData <http://purl.org/dc/terms/hasPart> ?subject. ?formData a <http://lblod.data.gift/vocabularies/automatische-melding/FormData>. ?submission <http://www.w3.org/ns/prov#generated> ?formData. ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
    "pathToSubmission": "?subject <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#dataSource> ?virtualFile . ?formData <http://purl.org/dc/terms/hasPart> ?virtualFile. ?formData a <http://lblod.data.gift/vocabularies/automatische-melding/FormData>. ?submission <http://www.w3.org/ns/prov#generated> ?formData. ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#RemoteDataObject",
    "pathToSubmission": "?formData <http://purl.org/dc/terms/hasPart> ?subject. ?formData a <http://lblod.data.gift/vocabularies/automatische-melding/FormData>. ?submission <http://www.w3.org/ns/prov#generated> ?formData. ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  },
  {
    "type": "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#LocalFileDataObject",
    "pathToSubmission": "?subject <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#dataSource> ?vfile. ?formData <http://purl.org/dc/terms/hasPart> ?vfile. ?formData a <http://lblod.data.gift/vocabularies/automatische-melding/FormData>. ?submission <http://www.w3.org/ns/prov#generated> ?formData. ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>."
  }
];

module.exports = {
  BATCH_SIZE,
  MU_CALL_SCOPE_ID_INITIAL_SYNC,
  BYPASS_MU_AUTH_FOR_EXPENSIVE_QUERIES,
  DIRECT_DATABASE_ENDPOINT,
  MAX_DB_RETRY_ATTEMPTS,
  SLEEP_BETWEEN_BATCHES,
  SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
  TMP_INGEST_GRAPH,
  ABB_URI,
  MAPPING_SUBMISSION_TYPE_ACCESSIBLE_BY_UNITS,
  MAPPING_TYPE_AND_PATH_TO_SUBMISSION
};
