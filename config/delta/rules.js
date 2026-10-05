export default [
  {
    match: {
      subject: {}
    },
    callback: {
      url: "http://resource/.mu/delta",
      method: "POST"
    },
    options: {
      resourceFormat: "v0.0.1",
      gracePeriod: 1000,
      ignoreFromSelf: true,
      optOutMuScopeIds: [
        "http://redpencil.data.gift/id/concept/muScope/deltas/consumer/initialSync",
        "http://redpencil.data.gift/id/concept/muScope/deltas/write-for-dispatch",
        "http://redpencil.data.gift/id/concept/muScope/deltas/vendor-data",
      ],
    }
  },
  {
    match: {
      graph: {
        type: 'uri',
        value: 'http://mu.semte.ch/graphs/temp/original-physical-files-data'
      }
    },
    callback: {
      url: 'http://files-consumer/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: "v0.0.1",
      gracePeriod: 10000,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      graph: {
        type: 'uri',
        value: 'http://mu.semte.ch/graphs/temp/for-dispatch'
      }
    },
    callback: {
      url: 'http://submissions-dispatcher/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: "v0.0.1",
      gracePeriod: 10000,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      // Everything from organisation graphs. Being more selective is not
      // possible. Graphs defined in mu-authorization.
      // The VDDS needs to react to individual triples, without context, and
      // make up for itself if the subject and its hierarchy is worth copying.
      // Also, withouth scopes as in the old mu-auth, we need to ignore data
      // that has already been passed through the VDDS, so anything already in
      // a vendor graph. Regex filter for everything in an organisation graph.
      graph: {
        type: 'uri',
        value: /^http:\/\/mu\.semte\.ch\/graphs\/organizations\/[^\/]+\/LoketLB-databankEredienstenGebruiker(-LF)?$/
      }
    },
    callback: {
      url: 'http://vendor-data-distribution/delta',
      method: 'POST',
    },
    options: {
      resourceFormat: "v0.0.1",
      gracePeriod: 10000,
      ignoreFromSelf: true,
      sendMatchesOnly: true,
    },
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      },
      object: {
        type: 'uri',
        value:'http://open-services.net/ns/core#Error'
      }
    },
    callback: {
      url: 'http://error-alert/delta',
      method:'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  },
];
