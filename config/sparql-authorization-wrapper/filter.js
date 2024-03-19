import * as mu from 'mu';
import * as mas from '@lblod/mu-auth-sudo';

export async function isAuthorized(sessionUri) {
  const checkSessionQuery = `
    PREFIX mu:        <http://mu.semte.ch/vocabularies/core/>
    PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
    PREFIX dct:       <http://purl.org/dc/terms/>

    SELECT DISTINCT ?uuid ?created ?account {
      GRAPH ?g {
        ${mu.sparqlEscapeUri(sessionUri)}
          a session:Session ;
          mu:uuid ?uuid ;
          dct:created ?created ;
          muAccount:account ?account ;
          muAccount:canActOnBehalfOf ?org .
      }
    }
  `;

  const response = await mas.querySudo(checkSessionQuery);

  // We want exactly one result, only one session should exist at a certain time.
  const exists = response.results?.bindings?.length === 1;

  return exists;
}
