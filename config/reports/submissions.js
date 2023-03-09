import { batchedQuery } from '../helpers.js';
import { generateReportFromQueryResult, getSafeValue } from './util/report-helpers';
import { querySudo as query } from '@lblod/mu-auth-sudo';

const PREFIXES = `
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
`;

const queryString = `
  ${PREFIXES}

  SELECT DISTINCT
    ?modifiedInLoketShort
    ?createdInLoketShort
    ?documentUri
    ?inzending
    ?createdInLoket
    ?modifiedInLoket
    ?orgUuid
    ?typeBesluit
    ?vanBestuurseenheid
  WHERE {

    GRAPH ?graph {
      ?inzending a <http://rdf.myexperiment.org/ontologies/base/Submission>;
      <http://purl.org/dc/terms/created> ?createdInLoket;
      <http://purl.org/dc/terms/modified> ?modifiedInLoket;
      <http://www.w3.org/ns/prov#generated> ?generated;
      <http://purl.org/dc/terms/subject> ?documentUri;
      <http://purl.org/pav/createdBy> ?vanBestuurseenheid.

      ?generated a <http://lblod.data.gift/vocabularies/automatische-melding/FormData>;
        <http://mu.semte.ch/vocabularies/ext/decisionType> ?typeBesluit.
    }
    FILTER(REGEX(STR(?graph), "^http://mu.semte.ch/graphs/organizations/", "i"))

    BIND(
        STRBEFORE(
          STRAFTER(STR(?graph), "http://mu.semte.ch/graphs/organizations/"),
          "/LoketLB-databankEredienstenGebruiker") as ?orgUuid)

    BIND(CONCAT(STR(YEAR(?createdInLoket)), '-', STR(MONTH(?createdInLoket)), '-', STR(DAY(?createdInLoket))) as ?createdInLoketShort)
    BIND(CONCAT(STR(YEAR(?modifiedInLoket)), '-', STR(MONTH(?modifiedInLoket)), '-', STR(DAY(?modifiedInLoket))) as ?modifiedInLoketShort)
  }
  ORDER BY ?inzending`;


function generateAanBestuurseenheidMetaQuery(uuids) {
  return `
      ${PREFIXES}
      SELECT DISTINCT ?orgUuid ?aanBestuurseenheidLabel ?aanBestuurseenheidClassLabel ?aanBestuurseenheid
      WHERE {
        VALUES ?orgUuid {
         ${uuids.map(uuid => '"' + uuid + '"').join('\n')}
        }

      ?aanBestuurseenheid a besluit:Bestuurseenheid;
        mu:uuid ?orgUuid;
        skos:prefLabel ?aanBestuurseenheidLabel.

      OPTIONAL {
           ?aanBestuurseenheid  besluit:classificatie ?aanClassificatie.
           ?aanClassificatie skos:prefLabel ?aanBestuurseenheidClassLabel.
        }
      }
  `;
}

function generateTypeBesluitMetaFromUris(uris) {
  return `
   ${PREFIXES}
   SELECT DISTINCT ?typeBesluit ?typeBesluitLabel
   WHERE {
     VALUES ?typeBesluit {
       ${uris.map(uri => "<" + uri + ">").join('\n')}
     }
     ?typeBesluit skos:prefLabel ?typeBesluitLabel.
   }
  `;
}

function generateVanBestuurseenheidMetaQuery(uris) {
  return `
  ${PREFIXES}
  SELECT DISTINCT ?vanBestuurseenheid
    ?vanBestuurseenheidLabel
    ?vanBestuurseenheidClassLabel
    WHERE {
     VALUES ?vanBestuurseenheid {
       ${uris.map(uri => "<" + uri + ">").join('\n')}
     }

      ?vanBestuurseenheid a besluit:Bestuurseenheid;
        skos:prefLabel ?vanBestuurseenheidLabel.

      OPTIONAL {
           ?vanBestuurseenheid  besluit:classificatie ?vanClassificatie.
           ?vanClassificatie skos:prefLabel ?vanBestuurseenheidClassLabel.
        }
    }

  `;
}

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

      //We want to append with labels etc, but query this takes to long in one query
      const distinctOrgUuid =
            queryResponse.
            results.
            bindings.reduce((acc, curr)  => { acc[curr.orgUuid.value] = ''; return acc;}, {});

      const distinctTypeBesluitUris =
            queryResponse.
            results.
            bindings.reduce((acc, curr)  => { acc[curr.typeBesluit.value] = ''; return acc; }, {});

      const distinctVanBestuurUris =
            queryResponse.
            results.
            bindings.reduce((acc, curr)  => { acc[curr.vanBestuurseenheid.value] = ''; return acc; }, {});

      const orgResults = await query(generateAanBestuurseenheidMetaQuery(Object.keys(distinctOrgUuid)));

      const besluitResults = await query(generateTypeBesluitMetaFromUris(Object.keys(distinctTypeBesluitUris)));

      const fromOrgResults = await query(generateVanBestuurseenheidMetaQuery(Object.keys(distinctVanBestuurUris)));

      // append the current results
      for(const binding of queryResponse.results.bindings) {

        const mappedBestuur = orgResults.results.bindings.find(b => b.orgUuid.value == binding.orgUuid.value );

        binding.aanBestuurseenheidLabel = { value: mappedBestuur.aanBestuurseenheidLabel.value };
        binding.aanBestuurseenheidClassLabel = { value: (mappedBestuur.aanBestuurseenheidClassLabel
                                                         && mappedBestuur.aanBestuurseenheidClassLabel.value)
                                                 || '' };


        binding.aanBestuurseenheid = { value: mappedBestuur.aanBestuurseenheid.value };


        const mappedBesluit = besluitResults.results.bindings.find(b => b.typeBesluit.value == binding.typeBesluit.value );
        binding.typeBesluitLabel = { value: mappedBesluit.typeBesluitLabel.value };

        const mappedVanBestuur = fromOrgResults.results.bindings.find(b => b.vanBestuurseenheid.value == binding.vanBestuurseenheid.value );

        binding.vanBestuurseenheidLabel = { value: mappedVanBestuur.vanBestuurseenheidLabel.value };

        binding.vanBestuurseenheidClassLabel = { value:
                                                 (mappedVanBestuur.vanBestuurseenheidClassLabel &&
                                                  mappedVanBestuur.vanBestuurseenheidClassLabel.value)
                                                 || '' };
      }

      queryResponse.head.vars = ['vanBestuurseenheidLabel',
                                 'aanBestuurseenheidLabel',
                                 'typeBesluitLabel',
                                 ...queryResponse.head.vars,
                                 'vanBestuurseenheidClassLabel',
                                 'aanBestuurseenheidClassLabel',
                                 'aanBestuurseenheid'
                                ];
      await generateReportFromQueryResult(queryResponse, metadata);
    }
    catch (e) {
      console.log(e);
      throw `Something unexpected went wrong when executing report for [${metadata.title}]`;
    }
  }
};
