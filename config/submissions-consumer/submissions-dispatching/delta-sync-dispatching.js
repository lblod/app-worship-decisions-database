const { BYPASS_MU_AUTH_FOR_EXPENSIVE_QUERIES,
        DIRECT_DATABASE_ENDPOINT,
        MU_CALL_SCOPE_ID_INITIAL_SYNC,
        BATCH_SIZE,
        MAX_DB_RETRY_ATTEMPTS,
        SLEEP_BETWEEN_BATCHES,
        SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
        INGEST_GRAPH,
        FILE_SYNC_GRAPH
      } = require('./config');
const { batchedDbUpdate, partition } = require('./utils');

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
async function dispatch(lib, data){
  const { mu, muAuthSudo } = lib;
  const { termObjectChangeSets } =  data;

  for (let { deletes, inserts } of termObjectChangeSets) {
    const deletePartitions = partition(deletes, o => o.subject.startsWith('<share://'));
    const regularDeletes = deletePartitions.fails;
    const fileDeletes = deletePartitions.passes;
    const fileDeleteStatements = fileDeletes.map(o => `${o.subject} ${o.predicate} ${o.object}.`);
    const deleteStatements = regularDeletes.map(o => `${o.subject} ${o.predicate} ${o.object}.`);

    await batchedDbUpdate(
      muAuthSudo.updateSudo,
      INGEST_GRAPH,
      deleteStatements,
      { 'mu-call-scope-id': 'http://redpencil.data.gift/id/concept/muScope/deltas/write-for-dispatch' },
      process.env.MU_SPARQL_ENDPOINT, //Note: this is the default endpoint through auth
      BATCH_SIZE,
      MAX_DB_RETRY_ATTEMPTS,
      SLEEP_BETWEEN_BATCHES,
      SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
      "DELETE"
    );

    await batchedDbUpdate(
      muAuthSudo.updateSudo,
      FILE_SYNC_GRAPH,
      fileDeleteStatements,
      { 'mu-call-scope-id': 'http://redpencil.data.gift/id/concept/muScope/deltas/write-for-dispatch' },
      process.env.MU_SPARQL_ENDPOINT, //Note: this is the default endpoint through auth
      BATCH_SIZE,
      MAX_DB_RETRY_ATTEMPTS,
      SLEEP_BETWEEN_BATCHES,
      SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
      "DELETE"
    );

    const insertPartitions = partition(inserts, o => o.subject.startsWith('<share://'));
    const regularInserts = insertPartitions.fails;
    const fileInserts = insertPartitions.passes;

    await batchedDbUpdate(
      muAuthSudo.updateSudo,
      INGEST_GRAPH,
      regularInserts.map(o => `${o.subject} ${o.predicate} ${o.object}.`),
      { },
      process.env.MU_SPARQL_ENDPOINT, //Note: this is the default endpoint through auth
      BATCH_SIZE,
      MAX_DB_RETRY_ATTEMPTS,
      SLEEP_BETWEEN_BATCHES,
      SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
      "INSERT"
    );

    await batchedDbUpdate(
      muAuthSudo.updateSudo,
      FILE_SYNC_GRAPH,
      fileInserts.map(o => `${o.subject} ${o.predicate} ${o.object}.`),
      { },
      process.env.MU_SPARQL_ENDPOINT,
      BATCH_SIZE,
      MAX_DB_RETRY_ATTEMPTS,
      SLEEP_BETWEEN_BATCHES,
      SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
      "INSERT"
    );
  }
}

module.exports = {
  dispatch
};
