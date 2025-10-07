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
      // Everything. We hoped to be more selective, but that is not possible.
      // Looking at the VDDS config, we only need Submission, FormData and
      // RemoteDataObject but what if a new attachment was added to the
      // FormData well after the FormData itself has been processed?
    },
    callback: {
      url: 'http://vendor-data-distribution/delta',
      method: 'POST',
    },
    options: {
      resourceFormat: "v0.0.1",
      gracePeriod: 10000,
      ignoreFromSelf: true,
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
