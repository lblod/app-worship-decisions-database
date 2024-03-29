import envvar from 'env-var';

const HOSTNAME = envvar
  .get('HOSTNAME')
  .required()
  .example('http://localhost')
  .asUrlString();

export const subjects = [
  /////////////////////////////////////////////////////////////////////////////
  // Submissions
  // via consumer from Loket
  /////////////////////////////////////////////////////////////////////////////
  //
  // The following queries always copy the whole model at once. E.g. if there
  // is a Submission to be copied to the vendor graph, also copy the FormData
  // and attachments to the vendor graph if they exist.
  // All data is also deleted before copied again. This is to make sure changes
  // are correctly updated. Otherwise you would see multiple values for the
  // same predicate because the old values are never deleted.

  /**
   * Submission
   */
  {
    type: 'http://rdf.myexperiment.org/ontologies/base/Submission',
    trigger: `
      ?subject a <http://rdf.myexperiment.org/ontologies/base/Submission> .
    `,
    path: `
      GRAPH ?g {
        ?subject a <http://rdf.myexperiment.org/ontologies/base/Submission> .
      }
      FILTER (REGEX(STR(?g), "^http://mu.semte.ch/graphs/organizations/"))
      BIND(STRAFTER(STR(?g), "http://mu.semte.ch/graphs/organizations/") AS ?afterPrefix)
      BIND(STRBEFORE(?afterPrefix, "/LoketLB-databankEredienstenGebruiker") AS ?uuid)
      ?organisation <http://mu.semte.ch/vocabularies/core/uuid> ?uuid .
    `,
    remove: {
      delete: `
        ?subject ?sp ?so .
        ?formdata ?fp ?fo .
        ?remotefile ?ro ?rp .
      `,
      where: `
        {
          ?subject <http://www.w3.org/ns/prov#generated> ?formdata .
          ?subject ?sp ?so .
          ?formdata ?fp ?fo .
        } UNION {
          ?subject <http://www.w3.org/ns/prov#generated> ?formdata .
          ?formdata <http://purl.org/dc/terms/hasPart> ?remotefile .
          ?remotefile ?ro ?rp .
        }
      `,
    },
    copy: {
      insert: `
        ?subject ?sp ?so .
        ?formdata ?fp ?fo .
        ?remotefile ?ro ?rp .
      `,
      where: `
        {
          ?subject <http://www.w3.org/ns/prov#generated> ?formdata .
          ?subject ?sp ?so .
          ?formdata ?fp ?fo .
        } UNION {
          ?subject <http://www.w3.org/ns/prov#generated> ?formdata .
          ?formdata <http://purl.org/dc/terms/hasPart> ?remotefile .
          ?remotefile ?ro ?rp .
        }
      `,
    },
    post: {
      delete: `
        ?formdata <http://mu.semte.ch/vocabularies/ext/sessionStartedAtTime> ?sessionStartedAtTime .
        ?formdata <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType .
        ?formdata <http://mu.semte.ch/vocabularies/ext/taxType> ?taxType .
        ?formdata <http://mu.semte.ch/vocabularies/ext/taxRateAmount> ?taxRateAmount .
        ?formdata <http://mu.semte.ch/vocabularies/ext/regulationType> ?regulationType .
        ?remotefile <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#url> ?originalDownloadLink .
      `,
      insert: `
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/sessionStartedAtTime> ?sessionStartedAtTime .
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/submissionType> ?decisionType .
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/taxType> ?taxType .
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/taxRateAmount> ?taxRateAmount .
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/regulationType> ?regulationType .
        ?remotefile <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#url> ?newDownloadLink .
        ?remotefile <https://www.w3.org/TR/prov-o/#hadPrimarySource> ?originalDownloadLink .
      `,
      where: `
        ?subject <http://www.w3.org/ns/prov#generated> ?formdata .
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/sessionStartedAtTime> ?sessionStartedAtTime . }
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType . }
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/taxType> ?taxType . }
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/taxRateAmount> ?taxRateAmount . }
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/regulationType> ?regulationType . }
        OPTIONAL {
          ?formdata <http://purl.org/dc/terms/hasPart> ?remotefile .
          ?remotefile <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#url> ?originalDownloadLink .
          FILTER (!REGEX(STR(?originalDownloadLink), "${HOSTNAME}files/"))
          ?remotefile <http://mu.semte.ch/vocabularies/core/uuid> ?remotefileUUID .
          BIND (CONCAT("${HOSTNAME}files/", STR(?remotefileUUID), "/download") AS ?newDownloadLink)
        }
      `,
    },
  },
  /**
   * FormData
   *
   * Linked to the Submission. Makes sure to check for a Submission to make a
   * path to the Bestuurseenheid.
   */
  {
    type: 'http://lblod.data.gift/vocabularies/automatische-melding/FormData',
    trigger: `
      ?subject a <http://lblod.data.gift/vocabularies/automatische-melding/FormData> .
      ?submission
        a <http://rdf.myexperiment.org/ontologies/base/Submission> ;
        <http://www.w3.org/ns/prov#generated> ?subject .
    `,
    path: `
      GRAPH ?g {
        ?submission
          a <http://rdf.myexperiment.org/ontologies/base/Submission> ;
          <http://www.w3.org/ns/prov#generated> ?subject .
      }
      FILTER (REGEX(STR(?g), "^http://mu.semte.ch/graphs/organizations/"))
      BIND(STRAFTER(STR(?g), "http://mu.semte.ch/graphs/organizations/") AS ?afterPrefix)
      BIND(STRBEFORE(?afterPrefix, "/LoketLB-databankEredienstenGebruiker") AS ?uuid)
      ?organisation <http://mu.semte.ch/vocabularies/core/uuid> ?uuid .
    `,
    remove: {
      delete: `
        ?submission ?sp ?so .
        ?subject ?fp ?fo .
        ?remotefile ?ro ?rp .
      `,
      where: `
        {
          ?submission <http://www.w3.org/ns/prov#generated> ?subject .
          ?submission ?sp ?so .
          ?subject ?fp ?fo .
        } UNION {
          ?submission <http://www.w3.org/ns/prov#generated> ?subject .
          ?subject <http://purl.org/dc/terms/hasPart> ?remotefile .
          ?remotefile ?ro ?rp .
        }
      `,
    },
    copy: {
      insert: `
        ?submission ?sp ?so .
        ?subject ?fp ?fo .
        ?remotefile ?ro ?rp .
      `,
      where: `
        {
          ?submission <http://www.w3.org/ns/prov#generated> ?subject .
          ?submission ?sp ?so .
          ?subject ?fp ?fo .
        } UNION {
          ?submission <http://www.w3.org/ns/prov#generated> ?subject .
          ?subject <http://purl.org/dc/terms/hasPart> ?remotefile .
          ?remotefile ?ro ?rp .
        }
      `,
    },
    post: {
      delete: `
        ?subject <http://mu.semte.ch/vocabularies/ext/sessionStartedAtTime> ?sessionStartedAtTime .
        ?subject <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType .
        ?subject <http://mu.semte.ch/vocabularies/ext/taxType> ?taxType .
        ?subject <http://mu.semte.ch/vocabularies/ext/taxRateAmount> ?taxRateAmount .
        ?subject <http://mu.semte.ch/vocabularies/ext/regulationType> ?regulationType .
        ?remotefile <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#url> ?originalDownloadLink .
      `,
      insert: `
        ?subject <http://lblod.data.gift/vocabularies/besluit/submission/form-data/sessionStartedAtTime> ?sessionStartedAtTime .
        ?subject <http://lblod.data.gift/vocabularies/besluit/submission/form-data/submissionType> ?decisionType .
        ?subject <http://lblod.data.gift/vocabularies/besluit/submission/form-data/taxType> ?taxType .
        ?subject <http://lblod.data.gift/vocabularies/besluit/submission/form-data/taxRateAmount> ?taxRateAmount .
        ?subject <http://lblod.data.gift/vocabularies/besluit/submission/form-data/regulationType> ?regulationType .
        ?remotefile <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#url> ?newDownloadLink .
        ?remotefile <https://www.w3.org/TR/prov-o/#hadPrimarySource> ?originalDownloadLink .
      `,
      where: `
        ?submission <http://www.w3.org/ns/prov#generated> ?subject .
        OPTIONAL { ?subject <http://mu.semte.ch/vocabularies/ext/sessionStartedAtTime> ?sessionStartedAtTime . }
        OPTIONAL { ?subject <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType . }
        OPTIONAL { ?subject <http://mu.semte.ch/vocabularies/ext/taxType> ?taxType . }
        OPTIONAL { ?subject <http://mu.semte.ch/vocabularies/ext/taxRateAmount> ?taxRateAmount . }
        OPTIONAL { ?subject <http://mu.semte.ch/vocabularies/ext/regulationType> ?regulationType . }
        OPTIONAL {
          ?subject <http://purl.org/dc/terms/hasPart> ?remotefile .
          ?remotefile <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#url> ?originalDownloadLink .
          FILTER (!REGEX(STR(?originalDownloadLink), "${HOSTNAME}files/"))
          ?remotefile <http://mu.semte.ch/vocabularies/core/uuid> ?remotefileUUID .
          BIND (CONCAT("${HOSTNAME}files/", STR(?remotefileUUID), "/download") AS ?newDownloadLink)
        }
      `,
    },
  },
  /**
   * FileDataObjects ←→ RemoteDataObjects
   *
   * Attachments to the FormData of the Submission. Links to the Submission and
   * FormData need to exist because a path to the Bestuurseenheid needs to be
   * made.
   */
  {
    type: 'http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject',
    trigger: `
      ?subject a <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject> .
      ?submission
        a <http://rdf.myexperiment.org/ontologies/base/Submission> ;
        <http://www.w3.org/ns/prov#generated> ?formdata .
      ?formdata
        a <http://lblod.data.gift/vocabularies/automatische-melding/FormData> ;
        <http://purl.org/dc/terms/hasPart> ?subject .
    `,
    path: `
      GRAPH ?g {
        ?submission
          a <http://rdf.myexperiment.org/ontologies/base/Submission> ;
          <http://www.w3.org/ns/prov#generated> ?formdata .
        ?formdata
          a <http://lblod.data.gift/vocabularies/automatische-melding/FormData> ;
          <http://purl.org/dc/terms/hasPart> ?subject .
      }
      FILTER (REGEX(STR(?g), "^http://mu.semte.ch/graphs/organizations/"))
      BIND(STRAFTER(STR(?g), "http://mu.semte.ch/graphs/organizations/") AS ?afterPrefix)
      BIND(STRBEFORE(?afterPrefix, "/LoketLB-databankEredienstenGebruiker") AS ?uuid)
      ?organisation <http://mu.semte.ch/vocabularies/core/uuid> ?uuid .
    `,
    remove: {
      delete: `
        ?submission ?sp ?so .
        ?formdata ?fp ?fo .
        ?subject ?ro ?rp .
      `,
      where: `
        {
          ?submission <http://www.w3.org/ns/prov#generated> ?formdata .
          ?submission ?sp ?so .
          ?formdata ?fp ?fo .
        } UNION {
          ?submission <http://www.w3.org/ns/prov#generated> ?formdata .
          ?formdata <http://purl.org/dc/terms/hasPart> ?subject .
          ?subject ?ro ?rp .
        }
      `,
    },
    copy: {
      insert: `
        ?submission ?sp ?so .
        ?formdata ?fp ?fo .
        ?subject ?ro ?rp .
      `,
      where: `
        {
          ?submission <http://www.w3.org/ns/prov#generated> ?formdata .
          ?submission ?sp ?so .
          ?formdata ?fp ?fo .
        } UNION {
          ?submission <http://www.w3.org/ns/prov#generated> ?formdata .
          ?formdata <http://purl.org/dc/terms/hasPart> ?subject .
          ?subject ?ro ?rp .
        }
      `,
    },
    post: {
      delete: `
        ?formdata <http://mu.semte.ch/vocabularies/ext/sessionStartedAtTime> ?sessionStartedAtTime .
        ?formdata <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType .
        ?formdata <http://mu.semte.ch/vocabularies/ext/taxType> ?taxType .
        ?formdata <http://mu.semte.ch/vocabularies/ext/taxRateAmount> ?taxRateAmount .
        ?formdata <http://mu.semte.ch/vocabularies/ext/regulationType> ?regulationType .
        ?subject <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#url> ?originalDownloadLink .
      `,
      insert: `
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/sessionStartedAtTime> ?sessionStartedAtTime .
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/submissionType> ?decisionType .
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/taxType> ?taxType .
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/taxRateAmount> ?taxRateAmount .
        ?formdata <http://lblod.data.gift/vocabularies/besluit/submission/form-data/regulationType> ?regulationType .
        ?subject <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#url> ?newDownloadLink .
        ?subject <https://www.w3.org/TR/prov-o/#hadPrimarySource> ?originalDownloadLink .
      `,
      where: `
        ?submission <http://www.w3.org/ns/prov#generated> ?formdata .
        ?formdata <http://purl.org/dc/terms/hasPart> ?subject .
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/sessionStartedAtTime> ?sessionStartedAtTime . }
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType . }
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/taxType> ?taxType . }
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/taxRateAmount> ?taxRateAmount . }
        OPTIONAL { ?formdata <http://mu.semte.ch/vocabularies/ext/regulationType> ?regulationType . }
        ?subject <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#url> ?originalDownloadLink .
        FILTER (!REGEX(STR(?originalDownloadLink), "${HOSTNAME}files/"))
        ?subject <http://mu.semte.ch/vocabularies/core/uuid> ?remotefileUUID .
        BIND (CONCAT("${HOSTNAME}files/", STR(?remotefileUUID), "/download") AS ?newDownloadLink)
      `,
    },
  },
];
