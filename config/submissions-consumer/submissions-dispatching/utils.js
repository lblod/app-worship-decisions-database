const {
  ABB_URI
} = require('./config');

async function batchedDbUpdateInAllGraphs(
  muUpdate,
  triples,
  extraHeaders,
  endpoint,
  batchSize,
  maxAttempts,
  sleepBetweenBatches = 1000,
  sleepTimeOnFail = 1000,
  operation = 'INSERT'
) {
  for (let i = 0; i < triples.length; i += batchSize) {
    console.log(`Inserting triples in batch: ${i}-${i + batchSize}`);

    const batch = triples.slice(i, i + batchSize).join('\n');

    const insertCall = async () => {
      await muUpdate(`
        ${operation} {
          GRAPH ?g {
            ${batch}
          }
        } WHERE {
          GRAPH ?g {
            ${batch}
          }
        }
      `, extraHeaders, endpoint);
    };

    await dbOperationWithRetry(insertCall, 0, maxAttempts, sleepTimeOnFail);

    console.log(`Sleeping before next query execution: ${sleepBetweenBatches}`);
    await new Promise(r => setTimeout(r, sleepBetweenBatches));
  }
}

async function batchedDbUpdateInGraph(
  muUpdate,
  graph,
  triples,
  extraHeaders,
  endpoint,
  batchSize,
  maxAttempts,
  sleepBetweenBatches = 1000,
  sleepTimeOnFail = 1000,
  operation = 'INSERT'
) {
  for (let i = 0; i < triples.length; i += batchSize) {
    console.log(`Inserting triples in batch: ${i}-${i + batchSize}`);

    const batch = triples.slice(i, i + batchSize).join('\n');

    const insertCall = async () => {
      await muUpdate(`
        ${operation} DATA {
          GRAPH <${graph}> {
            ${batch}
          }
        }
      `, extraHeaders, endpoint);
    };

    await dbOperationWithRetry(insertCall, 0, maxAttempts, sleepTimeOnFail);

    console.log(`Sleeping before next query execution: ${sleepBetweenBatches}`);
    await new Promise(r => setTimeout(r, sleepBetweenBatches));
  }
}

async function dbOperationWithRetry(
  callback,
  attempt,
  maxAttempts,
  sleepTimeOnFail
) {
  try {
    return await callback();
  }
  catch(e){
    console.log(`Operation failed for ${callback.toString()}, attempt: ${attempt} of ${maxAttempts}`);
    console.log(`Error: ${e}`);
    console.log(`Sleeping ${sleepTimeOnFail} ms`);

    if(attempt >= maxAttempts){
      console.log(`Max attempts reached for ${callback.toString()}, giving up`);
      throw e;
    }

    await new Promise(r => setTimeout(r, sleepTimeOnFail));
    return dbOperationWithRetry(callback, ++attempt, maxAttempts, sleepTimeOnFail);
  }
}

/**
 * Splits an array into two parts, a part that passes and a part that fails a predicate function.
 * Credits: https://github.com/benjay10
 * @public
 * @function partition
 * @param {Array} arr - Array to be partitioned
 * @param {Function} fn - Function that accepts single argument: an element of the array, and should return a truthy or falsy value.
 * @returns {Object} Object that contains keys passes and fails, each representing an array with elemets that pass or fail the predicate respectively
 */
function partition(arr, fn) {
  let passes = [], fails = [];
  arr.forEach((item) => (fn(item) ? passes : fails).push(item));
  return { passes, fails };
}

async function getAbbUuid(muQuery, sparqlEscapeUri) {
  const query = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    
    SELECT ?uuid WHERE {
      ${sparqlEscapeUri(ABB_URI)} mu:uuid ?uuid .
    }
  `;
  const result = await muQuery(query);

  if (result.results.bindings.length) {
    return result.results.bindings[0].uuid.value;
  } else {
    console.log(`No uuid found for ABB`);
    return null;
  }
}

async function getWorshipServiceUuid(muQuery, sparqlEscapeUri, submission) {
  const query = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX ere: <http://data.lblod.info/vocabularies/erediensten/>
    
    SELECT ?uuid WHERE {
      ${sparqlEscapeUri(submission)} pav:createdBy ?worshipService .
      ?worshipService a ere:BestuurVanDeEredienst ;
        mu:uuid ?uuid .
    }
  `;
  const result = await muQuery(query);

  if (result.results.bindings.length) {
    return result.results.bindings[0].uuid.value;
  } else {
    console.log(`No uuid found for the rworship service of submission with uuid ${submission}`);
    return null;
  }
}

async function getCentralWorshipServiceUuid(muQuery, sparqlEscapeUri, submission) {
  const query = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX ere: <http://data.lblod.info/vocabularies/erediensten/>
    
    SELECT ?uuid WHERE {
      ${sparqlEscapeUri(submission)} pav:createdBy ?worshipService .
      ?worshipService a ere:CentraalBestuurVanDeEredienst ;
        mu:uuid ?uuid .
    }
  `;
  const result = await muQuery(query);

  if (result.results.bindings.length) {
    return result.results.bindings[0].uuid.value;
  } else {
    console.log(`No uuid found for the central worship service of submission with uuid ${submission}`);
    return null;
  }
}

async function getInvolvedLocalAuthorityUuid(muQuery, sparqlEscapeUri, submission) {
  const query = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX ere: <http://data.lblod.info/vocabularies/erediensten/>
    PREFIX org: <http://www.w3.org/ns/org#>
    
    SELECT ?uuid WHERE {
      ${sparqlEscapeUri(submission)} pav:createdBy ?worshipService .
      ?involvedLocalAuthority ere:betrokkenBestuur/org:organization ?worshipService ;
        mu:uuid ?uuid .
    }
  `;
  const result = await muQuery(query);

  if (result.results.bindings.length) {
    return result.results.bindings[0].uuid.value;
  } else {
    console.log(`No uuid found for the involved local authority of submission with uuid ${submission}`);
    return null;
  }
}

async function getRepresentativeBodyUuid(muQuery, sparqlEscapeUri, submission) {
  const query = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX ere: <http://data.lblod.info/vocabularies/erediensten/>
    PREFIX org: <http://www.w3.org/ns/org#>
    
    SELECT ?uuid WHERE {
      ${sparqlEscapeUri(submission)} pav:createdBy ?worshipService .
      ?representativeBody org:linkedTo ?worshipService ;
        mu:uuid ?uuid .
    }
  `;
  const result = await muQuery(query);

  if (result.results.bindings.length) {
    return result.results.bindings[0].uuid.value;
  } else {
    console.log(`No uuid found for the representative body of submission with uuid ${submission}`);
    return null;
  }
}

async function getTypes(subject, query) {
  const queryGetType = `
    SELECT DISTINCT ?type WHERE {
      ${subject} a ?type .
    }
  `;

  const result = await query(queryGetType);

  if (result.results.bindings.length) {
    return result.results.bindings.map(binding => binding.type.value);
  } else {
    console.log(`Resource ${subject} has no type.`);
    return [];
  }
}

async function getSubmission(subject, pathToSubmission, query) {
  // This is extremely implict: the pathToSubmission expects the name
  // `?subject` as root node, and `?submission` as submission

  const queryGetType = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX prov: <http://www.w3.org/ns/prov#>

    SELECT DISTINCT (?submission as ?uri) ?submissionType WHERE {
      BIND(${subject} as ?subject).

      ${pathToSubmission}

      ?submission prov:generated/dct:type ?submissionType ;
        mu:uuid ?uuid .
    }
  `;

  const result = await query(queryGetType);

  if (result.results.bindings.length) {
    return {
      submissionType: result.results.bindings[0].submissionType.value,
      uri: result.results.bindings[0].uri.value
    }
  } else {
    console.log(`Resource ${subject} has no submission when following path ${pathToSubmission}.`);
    return null;
  }
}

async function moveFromTmpToOrgGraph(subject, update, unitsUuids, tmpGraph) {
  await update(`
    DELETE {
      GRAPH <${tmpGraph}> {
        ${subject} ?p ?o .
      }
    } INSERT {
      ${unitsUuids.map(unitUuid => `
        GRAPH <http://mu.semte.ch/graphs/organizations/${unitUuid}/EredienstBesluitendatabank-BesluitendatabankLezer> {
          ${subject} ?p ?o .
        }`
      ).join('\n')}
    } WHERE {
      GRAPH <${tmpGraph}> {
        ${subject} ?p ?o .
      }
    }
  `);
}

/**
 * Get subjects that are related to a submission and have triples in the tmp graph to be moved to org graphs
 */
async function getMovableSubjectsFromSubmission(submission, type, pathToSubmission, tmpGraph, sparqlEscapeUri, query) {
  // This is extremely implict: the pathToSubmission expects the name
  // `?subject` as root node, and `?submission` as submission

  const bindSubmission = `BIND(${sparqlEscapeUri(submission)} as ?submission)`;

  const queryStr = `
    SELECT DISTINCT ?subject WHERE {
      ${bindSubmission}
      ?subject a ${sparqlEscapeUri(type)}.

      ${pathToSubmission}

      GRAPH ${sparqlEscapeUri(tmpGraph)} {
        ?subject ?p ?o .
      }
    }
  `;

  const result = await query(queryStr);
  if (result.results.bindings.length) {
    return result.results.bindings.map(r => r.subject.value);
  }
  else {
    console.log(`No movable subjects found for ${submission} and ${type}`);
    return [];
  }
}

module.exports = {
  batchedDbUpdateInGraph,
  batchedDbUpdateInAllGraphs,
  partition,
  getAbbUuid,
  getWorshipServiceUuid,
  getCentralWorshipServiceUuid,
  getInvolvedLocalAuthorityUuid,
  getRepresentativeBodyUuid,
  getTypes,
  getSubmission,
  moveFromTmpToOrgGraph,
  getMovableSubjectsFromSubmission
};
