const {
  BATCH_SIZE,
  MAX_DB_RETRY_ATTEMPTS,
  SLEEP_BETWEEN_BATCHES,
  SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
  TMP_INGEST_GRAPH,
  MAPPING_TYPE_AND_PATH_TO_SUBMISSION,
  MAPPING_SUBMISSION_TYPE_ACCESSIBLE_BY_UNITS
} = require('./config');
const {
  batchedDbUpdateInGraph,
  batchedDbUpdateInAllGraphs,
  getAbbUuid,
  getWorshipServiceUuid,
  getCentralWorshipServiceUuid,
  getInvolvedLocalAuthorityUuid,
  getRepresentativeBodyUuid,
  getTypes,
  getSubmission,
  moveFromTmpToOrgGraph,
  getMovableSubjectsFromSubmission
} = require('./utils');

/**
 * Dispatch the fetched information to a target graph.
 * Note: <share://file/data> will be ADDED to it's own graph.
 *   We take only care of adding them, not updating triples, this is a TODO
 * @param { mu, muAuthSudo } lib - The provided libraries from the host service.
 * @param { termObjectChangeSets: { deletes, inserts } } data - The fetched changes sets, which objects of serialized Terms
 *          [ {
 *              graph: "<http://foo>",
 *              subject: "<http://bar>",
 *              predicate: "<http://baz>",
 *              object: "<http://boom>^^<http://datatype>"
 *            }
 *         ]
 * @return {void} Nothing
 */
async function dispatch(lib, data) {
  const { mu, muAuthSudo } = lib;
  const { termObjectChangeSets } =  data;

  for (let { deletes, inserts } of termObjectChangeSets) {
    // Delete case: we delete the received triple in the graph(s) it exists
    console.log(`Deleting data in all graphs`);
    await deleteTriplesInAllGraphs(deletes, muAuthSudo);

    // Insert case: we insert it to a temporary graph before dispatching the triples based on business rules
    console.log(`Inserting data in temporary graph <${TMP_INGEST_GRAPH}>`);
    await insertTriplesInTmpGraph(inserts, muAuthSudo);

    console.log(`Moving data from temporary graph <${TMP_INGEST_GRAPH}> to relevant application graphs.`);
    const subjects = [... new Set(inserts.map(o => o.subject))];
    await moveTriplesFromTmpGraph(subjects, muAuthSudo, mu);

    console.log(`Successfully finished consuming, waiting for next interation`);
  }
}

async function deleteTriplesInAllGraphs(deletes, muAuthSudo) {
  const deleteStatements = deletes.map(o => `${o.subject} ${o.predicate} ${o.object}.`);
  await batchedDbUpdateInAllGraphs(
    muAuthSudo.updateSudo,
    deleteStatements,
    { },
    process.env.MU_SPARQL_ENDPOINT, // Note: this is the default endpoint through auth
    BATCH_SIZE,
    MAX_DB_RETRY_ATTEMPTS,
    SLEEP_BETWEEN_BATCHES,
    SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
    "DELETE"
  );
}

async function insertTriplesInTmpGraph(inserts, muAuthSudo) {
  const insertStatements = inserts.map(o => `${o.subject} ${o.predicate} ${o.object}.`);
  await batchedDbUpdateInGraph(
    muAuthSudo.updateSudo,
    TMP_INGEST_GRAPH,
    insertStatements,
    { },
    process.env.MU_SPARQL_ENDPOINT, //Note: this is the default endpoint through auth
    BATCH_SIZE,
    MAX_DB_RETRY_ATTEMPTS,
    SLEEP_BETWEEN_BATCHES,
    SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
    "INSERT"
  );
}

// Credits https://github.com/lblod/prepare-submissions-for-export-service
async function moveTriplesFromTmpGraph(subjects, muAuthSudo, mu) {
  for (const subject of subjects) {
    // Get the types of the subject
    const types = await getTypes(subject, muAuthSudo.querySudo);

    // Get the mappings defining the paths to submission for the types found
    const mappings = MAPPING_TYPE_AND_PATH_TO_SUBMISSION.filter(mapping => types.includes(mapping.type));

    let processedSubmissions = [];
    for (const mapping of mappings) {
      // Find the submission linked to the subject following the path found in the mapping
      const submission = await getSubmission(subject, mapping.pathToSubmission, muAuthSudo.querySudo);

      if (submission) {
        processedSubmissions.push(submission);

        // Find the units that should have access to the subject based on the submission type
        const accessibleByUnits = MAPPING_SUBMISSION_TYPE_ACCESSIBLE_BY_UNITS.find(
          mapping => {
            return mapping.submissionType == submission.submissionType
          }
        ).accessibleBy;

        // Write the subject triples in all the graphs of the organizations that have access to it
        let unitsUuids = [];
        for (const accessibleByUnit of accessibleByUnits) {
          const unitUuid = await getAccessibleByUnitUuid(accessibleByUnit, muAuthSudo, mu, submission);
          unitsUuids.push(unitUuid);
        }
        console.log(`Moving all the triples of ${subject} to its organization graph with uuids ${unitsUuids}`);
        await moveFromTmpToOrgGraph(subject, muAuthSudo.updateSudo, unitsUuids, TMP_INGEST_GRAPH);
      }
    }

    for (const processedSubmission of processedSubmissions) {
      await scheduleRemainingResources(processedSubmission, muAuthSudo, mu);
    }
  }
}

async function getAccessibleByUnitUuid(accessibleByUnit, muAuthSudo, mu, submission) {
  let unitUuid = null;
  if (accessibleByUnit == "WORSHIP_SERVICE") {
    unitUuid = await getWorshipServiceUuid(
      muAuthSudo.querySudo,
      mu.sparqlEscapeUri,
      submission.uri
    );
  } else if (accessibleByUnit == "CENTRAL_WORSHIP_SERVICE") {
    unitUuid = await getCentralWorshipServiceUuid(
      muAuthSudo.querySudo,
      mu.sparqlEscapeUri,
      submission.uri
    );
  } else if (accessibleByUnit == "REPRESENTATIVE_BODY") {
    unitUuid = await getRepresentativeBodyUuid(
      muAuthSudo.querySudo,
      mu.sparqlEscapeUri,
      submission.uri
    );
  } else if (accessibleByUnit == "INVOLVED_LOCAL_AUTHORITIES") {
    unitUuid = await getInvolvedLocalAuthorityUuid(
      muAuthSudo.querySudo,
      mu.sparqlEscapeUri,
      submission.uri
    );
  } else if (accessibleByUnit == "ABB") {
    unitUuid = await getAbbUuid(
      muAuthSudo.querySudo,
      mu.sparqlEscapeUri
    );
  } else {
    console.log(`Submission ${submission.uri} is accessible by a unit type that is not configured: ${accessibleByUnit}`);
  }

  return unitUuid;
}

// Credits https://github.com/lblod/prepare-submissions-for-export-service
async function scheduleRemainingResources(submission, muAuthSudo, mu) {
  let remainingMovableSubjects = [];
  for (const config of MAPPING_TYPE_AND_PATH_TO_SUBMISSION) {
    const subjects = await getMovableSubjectsFromSubmission(
      submission.uri,
      config.type,
      config.pathToSubmission,
      TMP_INGEST_GRAPH,
      mu.sparqlEscapeUri,
      muAuthSudo.querySudo
    );
    remainingMovableSubjects = [ ...remainingMovableSubjects, ...subjects];
  }
  remainingMovableSubjects = [... new Set(remainingMovableSubjects)];
  remainingMovableSubjects = remainingMovableSubjects.map(subject => `<${subject}>`);
  await moveTriplesFromTmpGraph(remainingMovableSubjects, muAuthSudo, mu); // This ends eventually
}

module.exports = {
  dispatch
};
