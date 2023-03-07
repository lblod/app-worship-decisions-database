import { batchedQuery } from '../helpers.js';
import { generateReportFromQueryResult } from './util/report-helpers';
import { querySudo as query } from '@lblod/mu-auth-sudo';

const queryString = `
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
  PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  PREFIX pav: <http://purl.org/pav/>
  PREFIX adms: <http://www.w3.org/ns/adms#>
  PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX fo: <http://purl.org/ontology/fo/>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
  PREFIX eli: <http://data.europa.eu/eli/ontology#>
  PREFIX ma: <http://www.w3.org/ns/ma-ont#>
  PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>

  SELECT DISTINCT
    ?vanBestuurseenheidLabel
    ?aanBestuurseenheidLabel
    ?typeBesluitLabel
    ?modifiedInLoketShort
    ?createdInLoketShort
    ?documentUri
    ?inzending
    ?vanBestuurseenheidClassLabel
    ?aanBestuurseenheidClassLabel
    ?vanBestuurseenheid
    ?aanBestuurseenheid
    ?createdInLoket
    ?modifiedInLoket
  WHERE {

    GRAPH ?g {
      ?inzending a <http://rdf.myexperiment.org/ontologies/base/Submission>;
      <http://purl.org/dc/terms/created> ?createdInLoket;
      <http://purl.org/dc/terms/modified> ?modifiedInLoket;
      <http://www.w3.org/ns/prov#generated> ?generated;
      <http://purl.org/dc/terms/subject> ?documentUri;
      <http://purl.org/pav/createdBy> ?vanBestuurseenheid.

      ?generated a <http://lblod.data.gift/vocabularies/automatische-melding/FormData>;
        <http://mu.semte.ch/vocabularies/ext/decisionType> ?typeBesluit.
       ?typeBesluit skos:prefLabel ?typeBesluitLabel.
    }
    FILTER(REGEX(STR(?g), "^http://mu.semte.ch/graphs/organizations/", "i"))

    BIND(
        STRBEFORE(
          STRAFTER(STR(?g), "http://mu.semte.ch/graphs/organizations/"),
          "/LoketLB-databankEredienstenGebruiker") as ?targetUuid)

     GRAPH <http://mu.semte.ch/graphs/public> {
      ?vanBestuurseenheid a besluit:Bestuurseenheid;
        besluit:classificatie ?vanClassificatie;
        skos:prefLabel ?vanBestuurseenheidLabel.

      ?vanClassificatie skos:prefLabel ?vanBestuurseenheidClassLabel.

      ?aanBestuurseenheid a besluit:Bestuurseenheid;
        mu:uuid ?targetUuid;
        skos:prefLabel ?aanBestuurseenheidLabel.

      OPTIONAL {
           ?aanBestuurseenheid  besluit:classificatie ?aanClassificatie.
           ?aanClassificatie skos:prefLabel ?aanBestuurseenheidClassLabel.
        }
      }

      BIND(CONCAT(STR(YEAR(?createdInLoket)), '-', STR(MONTH(?createdInLoket)), '-', STR(DAY(?createdInLoket))) as ?createdInLoketShort)
      BIND(CONCAT(STR(YEAR(?modifiedInLoket)), '-', STR(MONTH(?modifiedInLoket)), '-', STR(DAY(?modifiedInLoket))) as ?modifiedInLoketShort)
  }
  ORDER BY ?inzending`;

const metadata = {
  title: 'Overzicht van inzendingen per bestuurseenheid',
  description: 'Overzicht van inzendingen per bestuurseenheid. Te vergelijken met rapporten uit loket',
  filePrefix: 'submissions'
};

export default {
  cronPattern: '0 15 23 * * *', // At 23:15.
  name: 'inzendingen-per-bestuurseenheid',
  execute: async () => {
    try {
      const queryResponse = await batchedQuery(queryString, 1000);
      await generateReportFromQueryResult(queryResponse, metadata);
    }
    catch (e) {
      throw `Something unexpected went wrong when executing report for [${metadata.title}]`;
    }
  }
};
